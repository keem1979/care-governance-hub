import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { DELEGATION_RESPONSIBILITIES, validateDelegationWindow } from "@/lib/management-intelligence";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requireAnyPermission([PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.MEMBERS_MANAGE]);
  const form = await request.formData();
  const delegateId = String(form.get("delegateId") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 100);
  const reason = String(form.get("reason") ?? "").trim().slice(0, 500);
  const locationId = String(form.get("locationId") ?? "") || null;
  const responsibilities = [...new Set(form.getAll("responsibilities").map(String))];
  const startsAt = new Date(String(form.get("startsAt") ?? ""));
  const endsAt = new Date(String(form.get("endsAt") ?? ""));
  if (delegateId === context.membershipId) return NextResponse.json({ error: "Choose another team member." }, { status: 400 });
  if (title.length < 3 || reason.length < 10) return NextResponse.json({ error: "Add a clear title and reason for the delegation." }, { status: 400 });
  if (!responsibilities.length || responsibilities.some((value) => !DELEGATION_RESPONSIBILITIES.includes(value as never))) return NextResponse.json({ error: "Choose at least one valid responsibility." }, { status: 400 });
  const dateError = validateDelegationWindow(startsAt, endsAt);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
  if (locationId && !context.locations.some(({ id }) => id === locationId)) return NextResponse.json({ error: "Choose a location you manage." }, { status: 403 });
  if (!context.allLocations && !locationId) return NextResponse.json({ error: "Choose one of your authorised locations for this delegation." }, { status: 400 });

  const db = createDb();
  try {
    const delegate = await db.organisationMembership.findFirst({
      where: { id: delegateId, organisationId: context.organisation.id, status: "ACTIVE", ...(locationId ? { OR: [{ allLocations: true }, { locations: { some: { locationId } } }] } : {}) },
      select: { id: true, user: { select: { name: true } } },
    });
    if (!delegate) return NextResponse.json({ error: "The selected team member is not active or cannot access that location." }, { status: 400 });
    const created = await db.$transaction(async (tx) => {
      const delegation = await tx.managementDelegation.create({ data: { organisationId: context.organisation.id, locationId, delegatorId: context.membershipId, delegateId, createdById: context.user.id, title, responsibilities, reason, startsAt, endsAt } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "ManagementDelegation", recordId: delegation.id, summary: `Delegated ${title} to ${delegate.user.name}`, afterValue: { delegateId, responsibilities, startsAt, endsAt } } });
      return delegation;
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the delegation." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
