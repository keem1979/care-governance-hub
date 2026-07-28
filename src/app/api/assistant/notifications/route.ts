import { NextResponse } from "next/server";
import { createDb } from "@/lib/db";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import {
  ATOM_UPDATES,
  canReceiveActionNotifications,
  orderPendingActions,
  PENDING_ACTION_STATUSES,
  type PendingActionNotification,
} from "@/lib/assistant-notifications";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export async function GET() {
  const context = await requireAuthorisedContext();
  const db = createDb();
  try {
    const actionWhere = {
      organisationId: context.organisation.id,
      ownerId: context.user.id,
      status: { in: [...PENDING_ACTION_STATUSES] as never[] },
      archivedAt: null,
    };
    const now = new Date();
    const inThirtyDays = new Date(now.getTime() + 30 * 86_400_000);
    const canSeeActions = canReceiveActionNotifications(context.permissions);
    const canSeeWorkforce =
      hasPermission(context.permissions, PERMISSIONS.WORKFORCE_VIEW) ||
      hasPermission(context.permissions, PERMISSIONS.WORKFORCE_MANAGE);
    const actionResult = canSeeActions
      ? await Promise.all([
          db.action.count({ where: actionWhere }),
          ...priorities.map((priority) =>
            db.action.findMany({
              where: { ...actionWhere, priority },
              select: {
                id: true,
                reference: true,
                title: true,
                priority: true,
                status: true,
                dueDate: true,
              },
              orderBy: { dueDate: "asc" },
              take: 8,
            }),
          ),
        ])
      : [0, [], [], [], []] as const;
    const [pendingCount, ...priorityGroups] = actionResult;
    const actions = orderPendingActions(
      priorityGroups.flat().map(
        (action): PendingActionNotification => ({
          id: action.id,
          reference: action.reference,
          title: action.title,
          priority: action.priority,
          status: action.status,
          dueDate: action.dueDate.toISOString(),
          isOverdue:
            action.status === "OVERDUE" ||
            (action.dueDate < now &&
              !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(action.status)),
          href: `/actions/${action.id}`,
        }),
      ),
    ).slice(0, 8);
    const workforceWhere = {
      organisationId: context.organisation.id,
      OR: [
        { expiryDate: { lte: inThirtyDays } },
        { nextDueDate: { lte: inThirtyDays } },
        { outcome: { in: ["PENDING", "DEVELOPMENT_REQUIRED"] as never[] } },
      ],
      staffMember: {
        archivedAt: null,
        employmentStatus: { in: ["ACTIVE", "ON_LEAVE"] as never[] },
        ...(context.allLocations
          ? {}
          : {
              OR: [
                { locationId: null },
                { locationId: { in: context.locations.map(({ id }) => id) } },
              ],
            }),
      },
    };
    const [workforceAlertCount, workforceRecords] = canSeeWorkforce
      ? await Promise.all([
          db.staffComplianceRecord.count({ where: workforceWhere }),
          db.staffComplianceRecord.findMany({
            where: workforceWhere,
            select: {
              id: true,
              staffMemberId: true,
              type: true,
              title: true,
              expiryDate: true,
              nextDueDate: true,
              staffMember: {
                select: {
                  employeeReference: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: [{ expiryDate: "asc" }, { nextDueDate: "asc" }],
            take: 8,
          }),
        ])
      : [0, []] as const;
    const workforceAlerts = workforceRecords
      .map((record) => {
        const dueDate = record.expiryDate ?? record.nextDueDate ?? now;
        return {
          id: record.id,
          staffId: record.staffMemberId,
          employeeReference: record.staffMember.employeeReference,
          staffName: `${record.staffMember.firstName} ${record.staffMember.lastName}`,
          title: record.title,
          type: record.type,
          dueDate: dueDate.toISOString(),
          isOverdue: dueDate < now,
          href: `/workforce/${record.staffMemberId}`,
        };
      })
      .sort(
        (left, right) =>
          Number(right.isOverdue) - Number(left.isOverdue) ||
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      );

    return NextResponse.json(
      {
        pendingCount,
        actions,
        workforceAlertCount,
        workforceAlerts,
        updates: ATOM_UPDATES,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } finally {
    await db.$disconnect();
  }
}
