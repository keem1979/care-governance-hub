import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { syncRegisterEvidence } from "@/lib/register-evidence";
import { assessmentPrerequisites, assessmentType } from "@/lib/assessments";
import { clientScopeWhere } from "@/lib/clients";
import { assertRegisterWriteScope, collectRegisterData, parseRegisterFields, registerScopeWhere, REGISTER_RISK_LEVELS, REGISTER_STATUSES } from "@/lib/registers";
import { workforceScopeWhere } from "@/lib/workforce";

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string; id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { key, id } = await params;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "update");
  const db = createDb();
  try {
    const entry = await db.registerEntry.findFirst({ where: { id, ...registerScopeWhere(context), definition: { key } }, include: { definition: true, evidenceLinks: true } });
    if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    assertRegisterWriteScope(context, entry.locationId);
    const assured = ["incidents", "complaints", "safeguarding"].includes(key);
    if (form.has("organisationId") && String(form.get("organisationId")) !== context.organisation.id) throw new Error("Organisation scope is not authorised.");
    if (!["update", "archive", "restore"].includes(intent)) throw new Error("Choose a valid record action.");

    if (intent === "archive" || intent === "restore") {
      const archive = intent === "archive";
      if (archive && entry.status === "ARCHIVED") throw new Error("This record is already archived.");
      if (!archive && entry.status !== "ARCHIVED") throw new Error("Only an archived record can be restored.");
      if (assured && archive) throw new Error("Governed records cannot be archived through the general record action.");
      if (assured && !archive && entry.closureDate) throw new Error("A previously closed governed record cannot be restored to Open without its authorised reopening workflow.");
      await db.$transaction(async (tx) => {
        const updated = await tx.registerEntry.update({ where: { id }, data: { status: archive ? "ARCHIVED" : "OPEN", archivedAt: archive ? new Date() : null } });
        await syncRegisterEvidence(tx, {
          entryId: id, organisationId: context.organisation.id, locationId: entry.locationId,
          definitionKey: key, definitionName: entry.definition.name, reference: entry.reference,
          title: entry.title, summary: entry.summary, eventDate: entry.eventDate,
          ownerId: entry.ownerId, actorId: context.user.id, archived: archive,
        });
        await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: archive ? "ARCHIVED" : "RESTORED", snapshot: { status: updated.status } } });
        await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: entry.locationId, userId: context.user.id, action: archive ? "ARCHIVE" : "RESTORE", recordType: "RegisterEntry", recordId: id, summary: `${archive ? "Archived" : "Restored"} ${entry.definition.name} entry: ${entry.reference}` } });
      });
      return NextResponse.json({ ok: true });
    }

    const title = String(form.get("title") ?? "").trim();
    const summary = String(form.get("summary") ?? "").trim();
    const submittedLocationId = String(form.get("locationId") ?? "") || null;
    const locationId = !context.allLocations && context.locations.length === 1 && !submittedLocationId ? context.locations[0].id : submittedLocationId;
    const ownerId = String(form.get("ownerId") ?? "") || null;
    const clientId = String(form.get("clientId") ?? "") || null;
    const staffMemberId = String(form.get("staffMemberId") ?? "") || null;
    const riskLevel = String(form.get("riskLevel") ?? entry.riskLevel);
    const status = String(form.get("status") ?? entry.status);
    if (title.length < 3 || summary.length < 3) throw new Error("Enter a title and summary.");
    if (!context.allLocations && !locationId) throw new Error("Choose an authorised location.");
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised location.");
    if (!REGISTER_RISK_LEVELS.includes(riskLevel as never) || !REGISTER_STATUSES.includes(status as never)) throw new Error("Choose valid values.");
    if (riskLevel === "UNASSESSED" && status === "CLOSED") throw new Error("Assess the risk before closing this record.");
    if (assured && ["CLOSED", "ARCHIVED"].includes(status)) throw new Error("Close or archive this governed record through its controlled lifecycle, not the general status field.");
    if (assured && (entry.status === "CLOSED" || entry.status === "ARCHIVED" || entry.archivedAt)) throw new Error("Reopen or restore this governed record through its controlled workflow before making changes.");
    if (assured && String(form.get("closureDate") ?? "").trim()) throw new Error("Closure dates are recorded only by Management Assurance.");
    if (ownerId && !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active owner.");
    if (clientId && !(await db.client.findFirst({ where: { id: clientId, ...clientScopeWhere(context) } }))) throw new Error("Choose an authorised client record.");
    if (staffMemberId && !(await db.staffMember.findFirst({ where: { id: staffMemberId, ...workforceScopeWhere(context) } }))) throw new Error("Choose an authorised staff record.");
    if (assessmentType(key)?.stage !== "SERVICE" && key.startsWith("assessment-") && !clientId) throw new Error("Choose the client this assessment relates to.");
    if (key === "safeguarding" && !clientId) throw new Error("Choose the client this safeguarding concern relates to.");
    const evidenceIds = form.getAll("evidenceIds").map(String).filter(Boolean);
    for (const evidenceId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const data: Record<string, unknown> = collectRegisterData(form, parseRegisterFields(entry.definition.fieldSchema));
    const prerequisiteReferences: Record<string, string> = {};
    for (const prerequisite of assessmentPrerequisites(key)) {
      const exists = clientId && await db.registerEntry.findFirst({ where: { organisationId: context.organisation.id, clientId, id: { not: id }, status: { not: "ARCHIVED" }, definition: { key: prerequisite.key } }, select: { reference: true }, orderBy: { eventDate: "desc" } });
      if (!exists) throw new Error(`${prerequisite.label} must be completed for this client first.`);
      prerequisiteReferences[prerequisite.key] = exists.reference;
    }
    if (Object.keys(prerequisiteReferences).length) data.prerequisiteReferences = prerequisiteReferences;
    const eventDate = parseOptionalDate(form.get("eventDate")) ?? entry.eventDate;
    const snapshot = { title, summary, riskLevel, status, data };

    await db.$transaction(async (tx) => {
      await tx.registerEntry.update({ where: { id }, data: { title, summary, locationId, clientId, staffMemberId, ownerId, riskLevel: riskLevel as never, status: status as never, eventDate, closureDate: ["incidents", "complaints", "safeguarding"].includes(key) ? entry.closureDate : parseOptionalDate(form.get("closureDate")), data: data as Prisma.InputJsonValue, evidenceLinks: { deleteMany: {}, create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      await syncRegisterEvidence(tx, {
        entryId: id, organisationId: context.organisation.id, locationId,
        definitionKey: key, definitionName: entry.definition.name, reference: entry.reference,
        title, summary, eventDate, ownerId, actorId: context.user.id, archived: status === "ARCHIVED",
      });
      await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: "UPDATED", snapshot: snapshot as Prisma.InputJsonValue } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "RegisterEntry", recordId: id, summary: `Updated ${entry.definition.name} entry: ${entry.reference}`, beforeValue: { title: entry.title, status: entry.status }, afterValue: snapshot as Prisma.InputJsonValue } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update entry." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
