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

const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export async function GET() {
  const context = await requireAuthorisedContext();
  if (!canReceiveActionNotifications(context.permissions)) {
    return NextResponse.json({ pendingCount: 0, actions: [], updates: ATOM_UPDATES });
  }

  const db = createDb();
  try {
    const where = {
      organisationId: context.organisation.id,
      ownerId: context.user.id,
      status: { in: [...PENDING_ACTION_STATUSES] as never[] },
      archivedAt: null,
    };
    const [pendingCount, ...priorityGroups] = await Promise.all([
      db.action.count({ where }),
      ...priorities.map((priority) =>
        db.action.findMany({
          where: { ...where, priority },
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
    ]);
    const now = new Date();
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

    return NextResponse.json(
      { pendingCount, actions, updates: ATOM_UPDATES },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } finally {
    await db.$disconnect();
  }
}

