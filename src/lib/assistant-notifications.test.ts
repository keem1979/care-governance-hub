import { describe, expect, it } from "vitest";
import {
  canReceiveActionNotifications,
  orderPendingActions,
  type PendingActionNotification,
} from "@/lib/assistant-notifications";
import { PERMISSIONS } from "@/lib/permissions";

function action(
  overrides: Partial<PendingActionNotification>,
): PendingActionNotification {
  return {
    id: "action-1",
    reference: "ACT-001",
    title: "Complete the improvement action",
    priority: "MEDIUM",
    status: "OPEN",
    dueDate: "2026-08-01T00:00:00.000Z",
    isOverdue: false,
    href: "/actions/action-1",
    ...overrides,
  };
}

describe("Abi action notifications", () => {
  it("shows overdue work before priority and then sorts by priority", () => {
    const ordered = orderPendingActions([
      action({ id: "medium", priority: "MEDIUM" }),
      action({ id: "critical", priority: "CRITICAL" }),
      action({ id: "overdue", priority: "LOW", isOverdue: true }),
      action({ id: "high", priority: "HIGH" }),
    ]);

    expect(ordered.map(({ id }) => id)).toEqual([
      "overdue",
      "critical",
      "high",
      "medium",
    ]);
  });

  it("uses the earliest due date when urgency is otherwise equal", () => {
    const ordered = orderPendingActions([
      action({ id: "later", dueDate: "2026-08-10T00:00:00.000Z" }),
      action({ id: "sooner", dueDate: "2026-08-03T00:00:00.000Z" }),
    ]);

    expect(ordered.map(({ id }) => id)).toEqual(["sooner", "later"]);
  });

  it("requires action-related access before showing assigned work", () => {
    expect(canReceiveActionNotifications([])).toBe(false);
    expect(
      canReceiveActionNotifications([PERMISSIONS.ASSIGNED_TASKS_EDIT]),
    ).toBe(true);
    expect(canReceiveActionNotifications([PERMISSIONS.GOVERNANCE_VIEW])).toBe(
      true,
    );
  });
});

