import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { workforceScopeWhere } from "@/lib/workforce";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.WORKFORCE_MANAGE);
  const { id } = await params;
  const form = await request.formData();
  const userId = String(form.get("userId") ?? "") || null;
  const db = createDb();
  try {
    const staff = await db.staffMember.findFirst({ where: { id, ...workforceScopeWhere(context) }, select: { id: true, locationId: true, employeeReference: true, userId: true } });
    if (!staff) return NextResponse.json({ error: "Staff record not found." }, { status: 404 });
    if (userId) {
      const membership = await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId, status: "ACTIVE", ...(staff.locationId ? { OR: [{ allLocations: true }, { locations: { some: { locationId: staff.locationId } } }] } : {}) } });
      if (!membership) return NextResponse.json({ error: "Choose an active user who can access this staff member's location." }, { status: 400 });
      const linked = await db.staffMember.findFirst({ where: { organisationId: context.organisation.id, userId, id: { not: id } }, select: { employeeReference: true } });
      if (linked) return NextResponse.json({ error: `That login is already linked to staff record ${linked.employeeReference}.` }, { status: 400 });
    }
    await db.$transaction([
      db.staffMember.update({ where: { id }, data: { userId } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: staff.locationId, userId: context.user.id, action: "PERMISSION_CHANGE", recordType: "StaffMemberAccountLink", recordId: id, summary: `${userId ? "Linked" : "Unlinked"} login for staff record ${staff.employeeReference}`, beforeValue: { userId: staff.userId }, afterValue: { userId } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the login link." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
