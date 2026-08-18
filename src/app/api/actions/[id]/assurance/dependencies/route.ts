import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { externalDependencyState } from "@/lib/assurance-improvement";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    const partyName = text(form, "partyName"), requestText = text(form, "request"), interimControl = text(form, "interimControl"), escalationRoute = text(form, "escalationRoute"), contactEmail = text(form, "contactEmail") || null, contactPhone = text(form, "contactPhone") || null;
    const requestedAt = parseOptionalDate(form.get("requestedAt")), dueDate = parseOptionalDate(form.get("dueDate")), ownerId = text(form, "ownerId");
    if (partyName.length < 2 || requestText.length < 8 || interimControl.length < 8 || escalationRoute.length < 8 || !requestedAt || !dueDate || !ownerId) throw new Error("Complete the external party, request, dates, interim control, escalation route and owner.");
    if (!contactEmail && !contactPhone) throw new Error("Add an email address or phone number for the external contact.");
    if (dueDate < requestedAt) throw new Error("The response due date cannot be before the request date.");
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active dependency owner.");
    const status = externalDependencyState({ status: "AWAITING_RESPONSE", dueDate, lastChasedAt: null });
    const item = await db.$transaction(async (tx) => {
      const created = await tx.externalDependency.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, actionId: id, partyName, contactName: text(form, "contactName") || null, contactEmail, contactPhone, request: requestText, externalReference: text(form, "externalReference") || null, requestedAt, dueDate, interimControl, escalationRoute, status: status as never, ownerId } });
      await tx.action.update({ where: { id }, data: { status: "BLOCKED", lifecycleStatus: "ACTION_IN_PROGRESS", escalationRequired: true, escalationReason: `Awaiting external response from ${partyName}` } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: "CREATE", recordType: "ExternalDependency", recordId: created.id, summary: `Recorded external dependency for ${action.reference}: ${partyName}`, afterValue: { partyName, dueDate, status, interimControl, ownerId } } });
      return created;
    });
    return NextResponse.json({ id: item.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add the external dependency." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
