import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.MEMBERS_MANAGE]);
  const { id } = await params;
  const form = await request.formData();
  const revokedReason = String(form.get("reason") ?? "").trim().slice(0, 500);
  if (revokedReason.length < 3) return NextResponse.json({ error: "Record why the delegation is ending." }, { status: 400 });
  const db = createDb();
  try {
    const record = await db.managementDelegation.findFirst({ where: { id, organisationId: context.organisation.id } });
    if (!record) return NextResponse.json({ error: "Delegation not found." }, { status: 404 });
    if (record.status !== "ACTIVE") return NextResponse.json({ error: "This delegation has already ended." }, { status: 400 });
    if (record.delegatorId !== context.membershipId && !hasPermission(context.permissions, PERMISSIONS.MEMBERS_MANAGE)) return NextResponse.json({ error: "Only the delegating manager or a user administrator can end this delegation." }, { status: 403 });
    await db.$transaction([
      db.managementDelegation.update({ where: { id: record.id }, data: { status: "REVOKED", revokedAt: new Date(), revokedReason } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: record.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "ManagementDelegation", recordId: record.id, summary: `Ended management delegation: ${record.title}`, afterValue: { status: "REVOKED", revokedReason } } }),
    ]);
    return NextResponse.json({ ok: true });
  } finally {
    await db.$disconnect();
  }
}
