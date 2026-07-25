import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { normaliseEmail, validateTemporaryPassword } from "@/lib/settings";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim(), email = normaliseEmail(form.get("email")), roleId = String(form.get("roleId") ?? ""), temporaryPassword = String(form.get("temporaryPassword") ?? "");
  const allLocations = form.get("allLocations") === "on", locationIds = [...new Set(form.getAll("locationIds").map(String))];
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid name and email address." }, { status: 400 });
  const db = createDb();
  try {
    const [role, validLocationCount, existing] = await Promise.all([
      db.role.findFirst({ where: { id: roleId, isSystem: true } }),
      db.serviceLocation.count({ where: { organisationId: context.organisation.id, id: { in: locationIds }, isActive: true } }),
      db.user.findUnique({ where: { email }, include: { memberships: { where: { organisationId: context.organisation.id } } } }),
    ]);
    if (!role) throw new Error("Choose a valid role.");
    if (validLocationCount !== locationIds.length) throw new Error("Choose valid service locations.");
    if (existing?.memberships.length) throw new Error("This user already belongs to the organisation.");
    if (!existing) validateTemporaryPassword(temporaryPassword);
    const membership = await db.$transaction(async (tx) => {
      const user = existing ?? await tx.user.create({ data: { name, email, passwordHash: await hash(temporaryPassword, 12) } });
      const created = await tx.organisationMembership.create({ data: { organisationId: context.organisation.id, userId: user.id, roleId, status: "ACTIVE", allLocations, joinedAt: new Date(), locations: { create: allLocations ? [] : locationIds.map((locationId) => ({ locationId })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "PERMISSION_CHANGE", recordType: "OrganisationMembership", recordId: created.id, summary: `Added user ${user.name} as ${role.name}.`, afterValue: { userId: user.id, roleId, allLocations, locationIds, status: "ACTIVE" } } });
      return created;
    });
    return NextResponse.json({ id: membership.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add the user." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
