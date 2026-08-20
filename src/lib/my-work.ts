export const MY_WORK_VIEWS = ["ALL", "OVERDUE", "DUE_SOON", "UPCOMING", "NEEDS_TARGET"] as const;

export type MyWorkView = (typeof MY_WORK_VIEWS)[number];
export type MyWorkUrgency = Exclude<MyWorkView, "ALL">;
export type MyWorkPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type MyWorkItem = {
  key: string;
  source: string;
  reference: string;
  title: string;
  detail: string;
  href: string;
  targetAt: Date | null;
  priority: MyWorkPriority;
  state: string;
  locationName: string;
  clientName?: string;
};

export function myWorkUrgency(targetAt: Date | null, now = new Date()): MyWorkUrgency {
  if (!targetAt) return "NEEDS_TARGET";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueSoon = new Date(today);
  dueSoon.setDate(dueSoon.getDate() + 7);
  if (targetAt < today) return "OVERDUE";
  if (targetAt < dueSoon) return "DUE_SOON";
  return "UPCOMING";
}

export function filterMyWork(items: readonly MyWorkItem[], view: MyWorkView, now = new Date()): MyWorkItem[] {
  return [...items]
    .filter((item) => view === "ALL" || myWorkUrgency(item.targetAt, now) === view)
    .sort((a, b) => compareMyWork(a, b, now));
}

export function myWorkView(value: string | string[] | undefined): MyWorkView {
  const requested = Array.isArray(value) ? value[0] : value;
  return MY_WORK_VIEWS.includes(requested as MyWorkView) ? requested as MyWorkView : "ALL";
}

export function myWorkViewLabel(value: MyWorkView): string {
  return ({ ALL: "All assigned", OVERDUE: "Overdue", DUE_SOON: "Due in 7 days", UPCOMING: "Later", NEEDS_TARGET: "Needs a target" })[value];
}

export function extractWorkTarget(data: unknown): Date | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  for (const key of ["dueDate", "reviewDueDate", "actionDueDate", "targetDate", "followUpDate", "nextReviewDate", "reviewDate"]) {
    const value = record[key];
    if (typeof value !== "string" && !(value instanceof Date)) continue;
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function compareMyWork(a: MyWorkItem, b: MyWorkItem, now: Date): number {
  const urgency = { OVERDUE: 0, DUE_SOON: 1, NEEDS_TARGET: 2, UPCOMING: 3 } as const;
  const priority = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  return urgency[myWorkUrgency(a.targetAt, now)] - urgency[myWorkUrgency(b.targetAt, now)]
    || priority[a.priority] - priority[b.priority]
    || (a.targetAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.targetAt?.getTime() ?? Number.MAX_SAFE_INTEGER)
    || a.title.localeCompare(b.title);
}
