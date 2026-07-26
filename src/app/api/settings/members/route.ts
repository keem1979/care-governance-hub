import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import {
  MEMBER_ACCESS_MODES,
  normaliseEmail,
  validateTemporaryPassword,
} from "@/lib/settings";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = normaliseEmail(form.get("email"));
  const roleId = String(form.get("roleId") ?? "");
  const temporaryPassword = String(form.get("temporaryPassword") ?? "");
  const accessMode = String(form.get("accessMode") ?? "STANDARD");
  const jobTitle = cleanOptional(form.get("jobTitle"));
  const department = cleanOptional(form.get("department"));
  const reportsToId = cleanOptional(form.get("reportsToId"));
  const allLocations = form.get("allLocations") === "on";
  const locationIds = unique(form.getAll("locationIds"));
  const permissionKeys = unique(form.getAll("permissionKeys"));

  if (
    name.length < 2 ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  ) {
    return NextResponse.json(
      { error: "Enter a valid name and email address." },
      { status: 400 },
    );
  }
  if (!MEMBER_ACCESS_MODES.includes(accessMode as never)) {
    return NextResponse.json(
      { error: "Choose standard or read-only access." },
      { status: 400 },
    );
  }

  const db = createDb();
  try {
    const [
      role,
      validLocationCount,
      existing,
      organisation,
      activeUsers,
      permissions,
      reportingManager,
    ] = await Promise.all([
      db.role.findFirst({ where: { id: roleId, isSystem: true } }),
      db.serviceLocation.count({
        where: {
          organisationId: context.organisation.id,
          id: { in: locationIds },
          isActive: true,
        },
      }),
      db.user.findUnique({
        where: { email },
        include: {
          memberships: {
            where: { organisationId: context.organisation.id },
          },
        },
      }),
      db.organisation.findUniqueOrThrow({
        where: { id: context.organisation.id },
        select: { licenceSeats: true },
      }),
      db.organisationMembership.count({
        where: {
          organisationId: context.organisation.id,
          status: "ACTIVE",
        },
      }),
      db.permission.findMany({
        where: { key: { in: permissionKeys } },
        select: { id: true, key: true },
      }),
      reportsToId
        ? db.organisationMembership.findFirst({
            where: {
              id: reportsToId,
              organisationId: context.organisation.id,
              status: "ACTIVE",
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!role) throw new Error("Choose a valid structural role.");
    if (validLocationCount !== locationIds.length) {
      throw new Error("Choose valid service locations.");
    }
    if (existing?.memberships.length) {
      throw new Error("This user already belongs to the organisation.");
    }
    if (activeUsers >= organisation.licenceSeats) {
      throw new Error(
        "All purchased licences are in use. Increase the licence quantity before adding another active user.",
      );
    }
    if (permissions.length !== permissionKeys.length) {
      throw new Error("One or more selected permissions are not valid.");
    }
    if (reportsToId && !reportingManager) {
      throw new Error("Choose a valid reporting manager.");
    }
    if (!existing) validateTemporaryPassword(temporaryPassword);

    const permissionIds = permissions.map(({ id }) => id);
    const membership = await db.$transaction(async (tx) => {
      const user =
        existing ??
        (await tx.user.create({
          data: {
            name,
            email,
            passwordHash: await hash(temporaryPassword, 12),
          },
        }));
      const created = await tx.organisationMembership.create({
        data: {
          organisationId: context.organisation.id,
          userId: user.id,
          roleId,
          status: "ACTIVE",
          accessMode: accessMode as never,
          jobTitle,
          department,
          reportsToId,
          permissionOverridesEnabled: true,
          allLocations,
          joinedAt: new Date(),
          locations: {
            create: allLocations
              ? []
              : locationIds.map((locationId) => ({ locationId })),
          },
          permissions: {
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
      });
      await tx.activityLog.create({
        data: {
          organisationId: context.organisation.id,
          userId: context.user.id,
          action: "PERMISSION_CHANGE",
          recordType: "OrganisationMembership",
          recordId: created.id,
          summary: `Added ${user.name} as ${role.name} with ${setting(accessMode)} access.`,
          afterValue: {
            userId: user.id,
            roleId,
            accessMode,
            jobTitle,
            department,
            reportsToId,
            permissionKeys,
            allLocations,
            locationIds,
            status: "ACTIVE",
          },
        },
      });
      return created;
    });

    return NextResponse.json(
      { id: membership.id, message: `${name} has been added.` },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not add the user.",
      },
      { status: 400 },
    );
  } finally {
    await db.$disconnect();
  }
}

function unique(values: FormDataEntryValue[]): string[] {
  return [...new Set(values.map(String).filter(Boolean))];
}

function cleanOptional(value: FormDataEntryValue | null): string | null {
  const cleaned = String(value ?? "").trim().slice(0, 120);
  return cleaned || null;
}

function setting(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}
