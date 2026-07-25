import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { MEMBER_STATUSES, validateMemberAccess } from "@/lib/settings";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  const { id } = await params, form = await request.formData(), roleId = String(form.get("roleId") ?? ""), status = String(form.get("status") ?? "");
  const allLocations = form.get("allLocations") === "on", locationIds = [...new Set(form.getAll("locationIds").map(String))], db = createDb();
  try {
    const [membership, role, validLocationCount, activeOwnerCount] = await Promise.all([
      db.organisationMembership.findFirst({ where: { id, organisationId: context.organisation.id }, include: { user: { select: { id: true, name: true } }, role: { select: { key: true, name: true } }, locations: { select: { locationId: true } } } }),
      db.role.findFirst({ where: { id: roleId, isSystem: true } }),
      db.serviceLocation.count({ where: { organisationId: context.organisation.id, id: { in: locationIds }, isActive: true } }),
      db.organisationMembership.count({ where: { organisationId: context.organisation.id, status: "ACTIVE", role: { key: "organisation-owner" } } }),
    ]);
    if (!membership) return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    if (!role || !MEMBER_STATUSES.includes(status as never)) throw new Error("Choose a valid role and status.");
    if (validLocationCount !== locationIds.length) throw new Error("Choose valid service locations.");
    validateMemberAccess({ isSelf: membership.user.id === context.user.id, currentRoleKey: membership.role.key, nextRoleKey: role.key, nextStatus: status, activeOwnerCount, currentAllLocations: membership.allLocations, nextAllLocations: allLocations, currentLocationIds: membership.locations.map((item) => item.locationId), nextLocationIds: locationIds });
    const before = { roleId: membership.roleId, role: membership.role.name, status: membership.status, allLocations: membership.allLocations, locationIds: membership.locations.map((item) => item.locationId) };
    const after = { roleId, role: role.name, status, allLocations, locationIds };
    await db.$transaction(async (tx) => {
      await tx.organisationMembership.update({ where: { id }, data: { roleId, status: status as never, allLocations, deactivatedAt: status === "DEACTIVATED" ? new Date() : null, locations: { deleteMany: {}, create: allLocations ? [] : locationIds.map((locationId) => ({ locationId })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "PERMISSION_CHANGE", recordType: "OrganisationMembership", recordId: id, summary: `Changed access for ${membership.user.name}.`, beforeValue: before, afterValue: after } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update access." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
