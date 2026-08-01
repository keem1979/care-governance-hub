import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { syncRegisterEvidence } from "@/lib/register-evidence";
import { collectRegisterData, parseRegisterFields, registerScopeWhere, REGISTER_RISK_LEVELS, REGISTER_STATUSES } from "@/lib/registers";

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string; id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { key, id } = await params;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "update");
  const db = createDb();
  try {
    const entry = await db.registerEntry.findFirst({ where: { id, ...registerScopeWhere(context), definition: { key } }, include: { definition: true, evidenceLinks: true } });
    if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

    if (intent === "archive" || intent === "restore") {
      const archive = intent === "archive";
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
    const locationId = String(form.get("locationId") ?? "") || null;
    const ownerId = String(form.get("ownerId") ?? "") || null;
    const riskLevel = String(form.get("riskLevel") ?? "LOW");
    const status = String(form.get("status") ?? "OPEN");
    if (title.length < 3 || summary.length < 3) throw new Error("Enter a title and summary.");
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised location.");
    if (!REGISTER_RISK_LEVELS.includes(riskLevel as never) || !REGISTER_STATUSES.includes(status as never)) throw new Error("Choose valid values.");
    if (ownerId && !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active owner.");
    const evidenceIds = form.getAll("evidenceIds").map(String).filter(Boolean);
    for (const evidenceId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const data = collectRegisterData(form, parseRegisterFields(entry.definition.fieldSchema));
    const eventDate = parseOptionalDate(form.get("eventDate")) ?? entry.eventDate;
    const snapshot = { title, summary, riskLevel, status, data };

    await db.$transaction(async (tx) => {
      await tx.registerEntry.update({ where: { id }, data: { title, summary, locationId, ownerId, riskLevel: riskLevel as never, status: status as never, eventDate, closureDate: parseOptionalDate(form.get("closureDate")), data, evidenceLinks: { deleteMany: {}, create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      await syncRegisterEvidence(tx, {
        entryId: id, organisationId: context.organisation.id, locationId,
        definitionKey: key, definitionName: entry.definition.name, reference: entry.reference,
        title, summary, eventDate, ownerId, actorId: context.user.id, archived: status === "ARCHIVED",
      });
      await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: "UPDATED", snapshot } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "RegisterEntry", recordId: id, summary: `Updated ${entry.definition.name} entry: ${entry.reference}`, beforeValue: { title: entry.title, status: entry.status }, afterValue: snapshot } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update entry." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
