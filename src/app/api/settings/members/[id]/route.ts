import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import {
  MEMBER_ACCESS_MODES,
  MEMBER_STATUSES,
  validateMemberAccess,
} from "@/lib/settings";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  const { id } = await params;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "update");
  const roleId = String(form.get("roleId") ?? "");
  const requestedStatus = String(form.get("status") ?? "");
  const status = intent === "remove" ? "DEACTIVATED" : requestedStatus;
  const accessMode = String(form.get("accessMode") ?? "STANDARD");
  const jobTitle = cleanOptional(form.get("jobTitle"));
  const department = cleanOptional(form.get("department"));
  const reportsToId = cleanOptional(form.get("reportsToId"));
  const allLocations = form.get("allLocations") === "on";
  const locationIds = unique(form.getAll("locationIds"));
  const permissionKeys = unique(form.getAll("permissionKeys"));
  const db = createDb();

  try {
    const [
      membership,
      role,
      validLocationCount,
      activeOwnerCount,
      activeUsers,
      organisation,
      permissions,
      reportingManager,
    ] = await Promise.all([
      db.organisationMembership.findFirst({
        where: { id, organisationId: context.organisation.id },
        include: {
          user: { select: { id: true, name: true } },
          role: {
            select: {
              key: true,
              name: true,
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
          permissions: {
            select: { permission: { select: { key: true } } },
          },
          locations: { select: { locationId: true } },
        },
      }),
      db.role.findFirst({ where: { id: roleId, isSystem: true } }),
      db.serviceLocation.count({
        where: {
          organisationId: context.organisation.id,
          id: { in: locationIds },
          isActive: true,
        },
      }),
      db.organisationMembership.count({
        where: {
          organisationId: context.organisation.id,
          status: "ACTIVE",
          accessMode: "STANDARD",
          role: { key: "organisation-owner" },
        },
      }),
      db.organisationMembership.count({
        where: {
          organisationId: context.organisation.id,
          status: "ACTIVE",
        },
      }),
      db.organisation.findUniqueOrThrow({
        where: { id: context.organisation.id },
        select: { licenceSeats: true },
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
              NOT: { id },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: "Membership not found." },
        { status: 404 },
      );
    }
    if (
      !role ||
      !MEMBER_STATUSES.includes(status as never) ||
      !MEMBER_ACCESS_MODES.includes(accessMode as never)
    ) {
      throw new Error("Choose a valid role, account status and access level.");
    }
    if (validLocationCount !== locationIds.length) {
      throw new Error("Choose valid service locations.");
    }
    if (permissions.length !== permissionKeys.length) {
      throw new Error("One or more selected permissions are not valid.");
    }
    if (reportsToId && !reportingManager) {
      throw new Error("Choose a valid reporting manager.");
    }
    if (
      membership.status !== "ACTIVE" &&
      status === "ACTIVE" &&
      activeUsers >= organisation.licenceSeats
    ) {
      throw new Error(
        "All purchased licences are in use. Increase the licence quantity before reactivating this user.",
      );
    }

    const currentPermissionKeys = (
      membership.permissionOverridesEnabled
        ? membership.permissions
        : membership.role.permissions
    ).map(({ permission }) => permission.key);
    validateMemberAccess({
      isSelf: membership.user.id === context.user.id,
      currentRoleKey: membership.role.key,
      nextRoleKey: role.key,
      nextStatus: status,
      activeOwnerCount,
      currentAccessMode: membership.accessMode,
      nextAccessMode: accessMode,
      currentPermissionKeys,
      nextPermissionKeys: permissionKeys,
      currentJobTitle: membership.jobTitle,
      nextJobTitle: jobTitle,
      currentDepartment: membership.department,
      nextDepartment: department,
      currentReportsToId: membership.reportsToId,
      nextReportsToId: reportsToId,
      currentAllLocations: membership.allLocations,
      nextAllLocations: allLocations,
      currentLocationIds: membership.locations.map((item) => item.locationId),
      nextLocationIds: locationIds,
    });

    const before = {
      roleId: membership.roleId,
      role: membership.role.name,
      status: membership.status,
      accessMode: membership.accessMode,
      jobTitle: membership.jobTitle,
      department: membership.department,
      reportsToId: membership.reportsToId,
      permissionKeys: currentPermissionKeys,
      allLocations: membership.allLocations,
      locationIds: membership.locations.map((item) => item.locationId),
    };
    const after = {
      roleId,
      role: role.name,
      status,
      accessMode,
      jobTitle,
      department,
      reportsToId,
      permissionKeys,
      allLocations,
      locationIds,
    };

    await db.$transaction(async (tx) => {
      await tx.organisationMembership.update({
        where: { id },
        data: {
          roleId,
          status: status as never,
          accessMode: accessMode as never,
          jobTitle,
          department,
          reportsToId,
          permissionOverridesEnabled: true,
          allLocations,
          deactivatedAt: status === "DEACTIVATED" ? new Date() : null,
          locations: {
            deleteMany: {},
            create: allLocations
              ? []
              : locationIds.map((locationId) => ({ locationId })),
          },
          permissions: {
            deleteMany: {},
            create: permissions.map(({ id: permissionId }) => ({
              permissionId,
            })),
          },
        },
      });
      if (status === "DEACTIVATED") {
        await tx.session.updateMany({
          where: { userId: membership.user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.activityLog.create({
        data: {
          organisationId: context.organisation.id,
          userId: context.user.id,
          action: "PERMISSION_CHANGE",
          recordType: "OrganisationMembership",
          recordId: id,
          summary:
            intent === "remove"
              ? `Removed ${membership.user.name}’s access while retaining their audit history.`
              : `Changed role and access for ${membership.user.name}.`,
          beforeValue: before,
          afterValue: after,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message:
        intent === "remove"
          ? `${membership.user.name}’s access has been removed.`
          : "Access updated.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update access.",
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
