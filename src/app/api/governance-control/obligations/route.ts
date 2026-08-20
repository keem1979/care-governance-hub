import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { OBLIGATION_TYPES } from "@/lib/governance-control";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), form = await request.formData(), db = createDb();
  try {
    const title = text(form, "title"), obligationType = text(form, "obligationType"), externalPartyId = text(form, "externalPartyId"), ownerId = text(form, "ownerId"), locationId = text(form, "locationId") || null, dueAt = parseOptionalDate(form.get("dueAt")), responseDueAt = parseOptionalDate(form.get("responseDueAt")), interimControl = text(form, "interimControl"), escalationRoute = text(form, "escalationRoute");
    if (title.length < 4 || !OBLIGATION_TYPES.includes(obligationType as never) || !externalPartyId || !ownerId || !dueAt || interimControl.length < 8 || escalationRoute.length < 8) throw new Error("Complete the obligation, external party, owner, deadline, interim control and escalation route.");
    if (responseDueAt && responseDueAt < dueAt) throw new Error("The external response date cannot be before the submission deadline.");
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised location.");
    const [party, owner] = await Promise.all([db.externalParty.findFirst({ where: { id: externalPartyId, organisationId: context.organisation.id, archivedAt: null } }), db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } })]);
    if (!party) throw new Error("Choose a controlled external party.");
    if (!owner) throw new Error("Choose an active accountable owner.");
    const obligation = await db.$transaction(async (tx) => {
      const counter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: context.organisation.id, key: "GOVERNANCE_OBLIGATION" } }, create: { organisationId: context.organisation.id, key: "GOVERNANCE_OBLIGATION", currentValue: 1 }, update: { currentValue: { increment: 1 } } });
      const reference = `GOV-${new Date().getUTCFullYear()}-${String(counter.currentValue).padStart(4, "0")}`;
      const created = await tx.governanceObligation.create({ data: { organisationId: context.organisation.id, locationId, reference, title, obligationType: obligationType as never, externalPartyId, ownerId, dueAt, responseDueAt, interimControl, escalationRoute, createdById: context.user.id } });
      await tx.governanceObligationUpdate.create({ data: { obligationId: created.id, updateType: "NOTE", note: "Obligation opened and ownership accepted.", actorId: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "GovernanceObligation", recordId: created.id, summary: `Opened external obligation ${reference}: ${title}`, afterValue: { obligationType, externalPartyId, ownerId, dueAt, responseDueAt } } });
      return created;
    });
    return NextResponse.json({ id: obligation.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the obligation." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
