import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { EVIDENCE_CATEGORIES, EVIDENCE_CONFIDENTIALITY, EVIDENCE_STATUSES, EVIDENCE_TYPES, evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate, splitList } from "@/lib/policies";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "update");
  const db = createDb();
  try {
    const current = await db.evidence.findFirst({ where: { id, ...evidenceScopeWhere(context) } });
    if (!current) return NextResponse.json({ error: "Evidence not found." }, { status: 404 });
    if (["RegisterEntry","Audit"].includes(current.relatedModule??"")) return NextResponse.json({ error: "This evidence is controlled by its source record. Update or archive the source instead." }, { status: 409 });
    if (intent === "archive" || intent === "restore") {
      const archive = intent === "archive";
      await db.$transaction([
        db.evidence.update({ where: { id }, data: { status: archive ? "ARCHIVED" : "ACTIVE", archivedAt: archive ? new Date() : null } }),
        db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: current.locationId, userId: context.user.id, action: archive ? "ARCHIVE" : "RESTORE", recordType: "Evidence", recordId: id, summary: `${archive ? "Archived" : "Restored"} evidence: ${current.title}` } }),
      ]);
      return NextResponse.json({ ok: true });
    }
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "");
    const evidenceType = String(form.get("evidenceType") ?? "");
    const ownerId = String(form.get("ownerId") ?? "");
    const locationId = String(form.get("locationId") ?? "") || null;
    const confidentiality = String(form.get("confidentiality") ?? "");
    const status = String(form.get("status") ?? "");
    if (title.length < 3 || title.length > 180) throw new Error("Enter a valid title.");
    if (!EVIDENCE_CATEGORIES.includes(category as never) || !EVIDENCE_TYPES.includes(evidenceType as never) || !EVIDENCE_CONFIDENTIALITY.includes(confidentiality as never) || !EVIDENCE_STATUSES.includes(status as never)) throw new Error("Choose valid evidence values.");
    if (locationId && !context.locations.some((location) => location.id === locationId)) throw new Error("Choose an authorised service location.");
    const owner = await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } });
    if (!owner) throw new Error("Choose an active record owner.");
    const relatedModule = String(form.get("relatedModule") ?? "") || null;
    const relatedRecordId = String(form.get("relatedRecordId") ?? "") || null;
    if (relatedModule === "Policy" && relatedRecordId && !(await db.policy.findFirst({ where: { id: relatedRecordId, organisationId: context.organisation.id } }))) throw new Error("Related policy not found.");
    await db.$transaction([
      db.evidence.update({ where: { id }, data: {
        title, description: String(form.get("description") ?? "").trim() || null, category, evidenceType, ownerId, locationId,
        evidenceDate: parseOptionalDate(form.get("evidenceDate")), reviewExpiryDate: parseOptionalDate(form.get("reviewExpiryDate")),
        tags: splitList(form.get("tags")), relatedModule, relatedRecordId,
        confidentiality: confidentiality as typeof current.confidentiality, status: status as typeof current.status,
        notes: String(form.get("notes") ?? "").trim() || null,
      } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "Evidence", recordId: id, summary: `Updated evidence: ${title}`, beforeValue: { title: current.title, status: current.status }, afterValue: { title, status } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update evidence." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
