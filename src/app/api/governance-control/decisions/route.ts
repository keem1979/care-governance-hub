import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { DECISION_IMPACTS } from "@/lib/governance-control";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), form = await request.formData(), db = createDb();
  try {
    const agendaItemId = text(form, "agendaItemId"), ownerId = text(form, "ownerId"), impact = text(form, "impact"), reviewDueAt = parseOptionalDate(form.get("reviewDueAt")), externalPartyId = text(form, "externalPartyId") || null;
    if (!agendaItemId || !ownerId || !DECISION_IMPACTS.includes(impact as never)) throw new Error("Choose a meeting decision, accountable owner and impact level.");
    const agenda = await db.meetingAgendaItem.findFirst({ where: { id: agendaItemId, decision: { not: null }, meeting: { organisationId: context.organisation.id, status: "APPROVED", ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }) } }, include: { meeting: true } });
    if (!agenda?.decision?.trim()) throw new Error("Only a recorded decision from approved minutes can become a controlled decision.");
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active accountable owner.");
    if (externalPartyId && !(await db.externalParty.findFirst({ where: { id: externalPartyId, organisationId: context.organisation.id, archivedAt: null } }))) throw new Error("Choose a controlled external party.");
    const created = await db.$transaction(async (tx) => {
      const item = await tx.governanceDecision.create({ data: { organisationId: context.organisation.id, locationId: agenda.meeting.locationId, meetingId: agenda.meetingId, agendaItemId: agenda.id, decisionText: agenda.decision!.trim(), impact: impact as never, status: agenda.linkedActionId ? "ACTION_REQUIRED" : "RECORDED", ownerId, effectiveDate: parseOptionalDate(form.get("effectiveDate")), reviewDueAt, linkedActionId: agenda.linkedActionId, externalPartyId, createdById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: agenda.meeting.locationId, userId: context.user.id, action: "CREATE", recordType: "GovernanceDecision", recordId: item.id, summary: `Registered controlled decision from ${agenda.meeting.reference}`, afterValue: { agendaItemId, impact, ownerId, linkedActionId: agenda.linkedActionId, reviewDueAt } } });
      return item;
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not register the decision." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
