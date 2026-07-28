import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const PENDING_ACTION_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "AWAITING_EVIDENCE",
  "AWAITING_VERIFICATION",
  "OVERDUE",
] as const;

export type PendingActionNotification = {
  id: string;
  reference: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  dueDate: string;
  isOverdue: boolean;
  href: string;
};

export type WorkforceNotification = {
  id: string;
  staffId: string;
  employeeReference: string;
  staffName: string;
  title: string;
  type: string;
  dueDate: string;
  isOverdue: boolean;
  href: string;
};

export const ATOM_UPDATES = [
  {
    id: "workforce-quality",
    title: "Workforce competency and care-quality controls",
    summary:
      "Track staff checks, training and competencies alongside care reviews, MAR audits, outcomes and continuity.",
    href: "/workforce",
  },
  {
    id: "abi-guidance",
    title: "Abi now explains HSC and CQC relevance",
    summary:
      "Ask Abi what a module is for, how to use it and why it matters for inspection readiness.",
    href: "/dashboard",
  },
  {
    id: "permissions",
    title: "More precise user access controls",
    summary:
      "Administrators can assign page access, working permissions and read-only access by user.",
    href: "/settings/roles",
  },
] as const;

const priorityRank: Record<PendingActionNotification["priority"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function canReceiveActionNotifications(permissions: readonly string[]) {
  return [
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.ACTIONS_MANAGE,
    PERMISSIONS.ASSIGNED_TASKS_EDIT,
  ].some((permission) => hasPermission(permissions, permission));
}

export function orderPendingActions(
  actions: PendingActionNotification[],
): PendingActionNotification[] {
  return [...actions].sort((left, right) => {
    if (left.isOverdue !== right.isOverdue) return left.isOverdue ? -1 : 1;
    const priorityDifference =
      priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDifference) return priorityDifference;
    return (
      new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
    );
  });
}
