import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { actionScopeWhere } from "@/lib/actions";
import { ACTION_EVIDENCE_ROLES, linkActionEvidence, type ActionEvidenceRole } from "@/lib/action-assurance";
import { evidenceScopeWhere, titleFromFileName, validateEvidenceFile } from "@/lib/evidence";
import { taxonomyLabels } from "@/lib/evidence-taxonomy";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { deletePrivateFile, putPrivateFile } from "@/lib/private-storage";
import { registerScopeWhere } from "@/lib/registers";

const REGISTER_KEYS = { INCIDENT: "incidents", COMPLAINT: "complaints", SAFEGUARDING: "safeguarding" } as const;
type RegisterSource = keyof typeof REGISTER_KEYS;

export async function POST(request: Request) {
  const context = await requireAnyPermission([PERMISSIONS.EVIDENCE_UPLOAD, PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.ACTIONS_MANAGE]);
  const form = await request.formData();
  const sourceType = String(form.get("sourceType") ?? "").toUpperCase();
  const sourceId = String(form.get("sourceId") ?? "");
  const evidenceId = String(form.get("evidenceId") ?? "");
  const document = form.get("document");
  const isUpload = document instanceof File;
  const storageKey = `${context.organisation.id}/evidence/${crypto.randomUUID()}`;
  let stored = false;
  const db = createDb();
  try {
    if (!sourceId || (isUpload === Boolean(evidenceId))) throw new Error("Choose one file or one existing Evidence record.");
    if (isUpload && !hasPermission(context.permissions, PERMISSIONS.EVIDENCE_UPLOAD)) {
      return NextResponse.json({ error: "You are not authorised to upload Evidence." }, { status: 403 });
    }
    if (isUpload) validateEvidenceFile(document);

    const isAction = sourceType === "ACTION";
    if (!isAction && !(sourceType in REGISTER_KEYS)) throw new Error("Choose a supported Evidence source.");
    const requiredPermission = isAction ? PERMISSIONS.ACTIONS_MANAGE : PERMISSIONS.GOVERNANCE_EDIT;
    if (!hasPermission(context.permissions, requiredPermission)) {
      return NextResponse.json({ error: "You are not authorised to change this source record." }, { status: 403 });
    }
    const roleValue = String(form.get("role") ?? "");
    if (isAction && !ACTION_EVIDENCE_ROLES.includes(roleValue as ActionEvidenceRole)) throw new Error("Choose a valid Action Evidence role.");
    if (!isAction && roleValue) throw new Error("A Register attachment cannot set an Action Evidence role.");
    const role = roleValue as ActionEvidenceRole;

    const source = isAction
      ? await db.action.findFirst({ where: { id: sourceId, ...actionScopeWhere(context) }, select: { id: true, locationId: true, reference: true, status: true, closedAt: true, archivedAt: true, clientId: true, staffMemberId: true } })
      : await db.registerEntry.findFirst({ where: { id: sourceId, ...registerScopeWhere(context), definition: { key: REGISTER_KEYS[sourceType as RegisterSource] } }, select: { id: true, locationId: true, reference: true, status: true, clientId: true, staffMemberId: true } });
    if (!source) return NextResponse.json({ error: "Source record not found." }, { status: 404 });
    if (isAction
      ? "closedAt" in source && (source.closedAt || source.archivedAt || ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(source.status))
      : "status" in source && ["CLOSED", "ARCHIVED"].includes(source.status)) {
      throw new Error("Closed records are read-only. Reopen the record before adding Evidence.");
    }

    if (evidenceId) {
      const existing = await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context), status: "ACTIVE", archivedAt: null }, select: { id: true, locationId: true } });
      if (!existing || (existing.locationId && existing.locationId !== source.locationId)) {
        return NextResponse.json({ error: "Evidence is outside the source record's authorised location." }, { status: 404 });
      }
      await db.$transaction(async (tx) => {
        if (isAction) await linkActionEvidence(tx, { actionId: sourceId, organisationId: context.organisation.id, evidenceIds: [existing.id], role, actorId: context.user.id });
        else await tx.registerEntryEvidence.createMany({ data: [{ entryId: sourceId, evidenceId: existing.id }], skipDuplicates: true });
        await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: source.locationId, userId: context.user.id, action: "CREATE", recordType: isAction ? "ActionEvidence" : "RegisterEntryEvidence", recordId: sourceId, summary: `Linked existing Evidence to ${source.reference}`, afterValue: { evidenceId: existing.id, sourceType, role: isAction ? role : "SUPPORTING" } } });
      });
      return NextResponse.json({ id: existing.id, evidenceId: existing.id, linked: true });
    }

    // A neutral, governed classification avoids inferring the uploaded document's meaning from its parent.
    const labels = taxonomyLabels("OTHER", "OTHER_SPECIFIED");
    if (!labels || !(document instanceof File)) throw new Error("Could not prepare Evidence upload.");
    const bytes = await document.arrayBuffer();
    const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const title = titleFromFileName(document.name);
    await putPrivateFile(storageKey, bytes);
    stored = true;
    const created = await db.$transaction(async (tx) => {
      const evidence = await tx.evidence.create({ data: {
        organisationId: context.organisation.id, locationId: source.locationId, title,
        category: labels.familyLabel, evidenceType: labels.typeLabel,
        taxonomyFamilyKey: "OTHER", taxonomyTypeKey: "OTHER_SPECIFIED", taxonomyFamilySnapshot: labels.familyLabel, taxonomyTypeSnapshot: labels.typeLabel,
        currentnessMode: labels.currentnessMode, currentnessStatus: "CURRENT",
        ownerId: context.user.id, uploadedById: context.user.id, confidentiality: "CONFIDENTIAL",
        sourceType: "UPLOADED_DOCUMENT", sourceName: "QCGMS contextual upload", sourceReference: source.reference,
        relatedModule: isAction ? "Action" : "RegisterEntry", relatedRecordId: source.id,
      } });
      const version = await tx.evidenceVersion.create({ data: {
        evidenceId: evidence.id, versionNumber: "1.0", storageKey, fileName: document.name,
        contentType: document.type, sizeBytes: document.size, checksum, changeNotes: "Initial upload", uploadedById: context.user.id,
      } });
      await tx.evidence.update({ where: { id: evidence.id }, data: { currentVersionId: version.id } });
      if (isAction) await linkActionEvidence(tx, { actionId: sourceId, organisationId: context.organisation.id, evidenceIds: [evidence.id], role, actorId: context.user.id });
      else await tx.registerEntryEvidence.create({ data: { entryId: sourceId, evidenceId: evidence.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: source.locationId, userId: context.user.id, action: "CREATE", recordType: "Evidence", recordId: evidence.id, summary: `Uploaded Evidence to ${source.reference}: ${title}`, afterValue: { sourceType, sourceId, role: isAction ? role : "SUPPORTING", version: "1.0", checksum, clientId: source.clientId, staffMemberId: source.staffMemberId } } });
      return evidence;
    });
    return NextResponse.json({ id: created.id, evidenceId: created.id, linked: true }, { status: 201 });
  } catch (error) {
    if (stored) await deletePrivateFile(storageKey).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add Evidence." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
