export const ACTIVITY_ACTIONS = [
  "CREATE",
  "UPDATE",
  "ARCHIVE",
  "RESTORE",
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "PERMISSION_CHANGE",
  "DOWNLOAD",
  "REPORT_GENERATION",
  "APPROVAL",
  "STATUS_CHANGE",
  "CLOSE",
] as const;

export const ACTIVITY_PAGE_SIZE = 50;

export const ACTIVITY_FOCUS = {
  security: ["LOGIN", "LOGIN_FAILED", "LOGOUT", "PERMISSION_CHANGE"],
  changes: ["CREATE", "UPDATE", "ARCHIVE", "RESTORE", "APPROVAL", "STATUS_CHANGE", "CLOSE"],
  exports: ["DOWNLOAD", "REPORT_GENERATION"],
} as const;

export type ActivityFilters = {
  q?: string;
  action?: string;
  recordType?: string;
  userId?: string;
  locationId?: string;
  from?: Date;
  to?: Date;
  focus?: keyof typeof ACTIVITY_FOCUS;
  page: number;
};

export function parseActivityFilters(
  query: Record<string, string | string[] | undefined>,
  allowedLocations: readonly string[],
): ActivityFilters {
  const requestedLocation = single(query.location);
  const page = Number.parseInt(single(query.page), 10);
  return {
    ...(single(query.q).trim() ? { q: single(query.q).trim().slice(0, 120) } : {}),
    ...(ACTIVITY_ACTIONS.includes(single(query.action) as (typeof ACTIVITY_ACTIONS)[number]) ? { action: single(query.action) } : {}),
    ...(single(query.recordType) ? { recordType: single(query.recordType) } : {}),
    ...(single(query.user) ? { userId: single(query.user) } : {}),
    ...(requestedLocation && allowedLocations.includes(requestedLocation)
      ? { locationId: requestedLocation }
      : {}),
    ...(parseDate(query.from, false) ? { from: parseDate(query.from, false) } : {}),
    ...(parseDate(query.to, true) ? { to: parseDate(query.to, true) } : {}),
    ...(Object.hasOwn(ACTIVITY_FOCUS, single(query.focus)) ? { focus: single(query.focus) as keyof typeof ACTIVITY_FOCUS } : {}),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10000) : 1,
  };
}

export function activityLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function activityRecordHref(recordType: string, recordId: string | null): string | null {
  if (!recordId) return null;
  const routes: Record<string, string> = {
    Action: "actions",
    ActionUpdate: "actions",
    Audit: "audits",
    CalendarItem: "calendar",
    ComplianceRequirement: "inspection",
    Evidence: "evidence",
    GovernanceMeeting: "meetings",
    Policy: "policies",
    Risk: "risks",
    RiskReview: "risks",
    StaffMember: "workforce",
    Template: "templates",
    Client: "clients",
    ServiceLocation: "settings",
    ActivityLog: "activity",
  };
  return routes[recordType] ? `/${routes[recordType]}/${recordId}` : null;
}

export type ActivityChange = { field: string; before: string; after: string };

export function activityChanges(beforeValue: unknown, afterValue: unknown): ActivityChange[] {
  const before = flattenActivityValue(safeActivityValue(beforeValue));
  const after = flattenActivityValue(safeActivityValue(afterValue));
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().map((field) => ({
    field: activityFieldLabel(field),
    before: before[field] ?? "—",
    after: after[field] ?? "—",
  })).filter((change) => change.before !== change.after);
}

export function activityFocusActions(focus: ActivityFilters["focus"]): readonly string[] | undefined {
  return focus ? ACTIVITY_FOCUS[focus] : undefined;
}

export function safeActivityValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeActivityValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    /(password|token|secret|storagekey|checksum)/i.test(key) ? "[REDACTED]" : safeActivityValue(item),
  ]));
}

export function activityCsv(rows: Array<{
  id: string;
  createdAt: Date;
  user: { name: string; email: string } | null;
  location: { name: string } | null;
  action: string;
  recordType: string;
  recordId: string | null;
  summary: string;
  beforeValue: unknown;
  afterValue: unknown;
}>): string {
  const header = ["Event ID", "Date and time (UTC)", "User", "Email", "Location", "Action", "Record type", "Record identifier", "Summary", "Changed fields", "Before", "After"];
  const values = rows.map((row) => [
    row.id,
    row.createdAt.toISOString(),
    row.user?.name ?? "System",
    row.user?.email ?? "",
    row.location?.name ?? "Organisation-wide",
    row.action,
    row.recordType,
    row.recordId ?? "",
    row.summary,
    activityChanges(row.beforeValue, row.afterValue).map((item) => item.field).join("; "),
    row.beforeValue ? JSON.stringify(safeActivityValue(row.beforeValue)) : "",
    row.afterValue ? JSON.stringify(safeActivityValue(row.afterValue)) : "",
  ]);
  return `\uFEFF${[header, ...values].map((row) => row.map(csv).join(",")).join("\r\n")}`;
}

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseDate(value: string | string[] | undefined, end: boolean): Date | undefined {
  const text = single(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const parsed = new Date(`${text}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) return undefined;
  return parsed;
}

function flattenActivityValue(value: unknown, prefix = ""): Record<string, string> {
  if (value === null || value === undefined) return {};
  if (Array.isArray(value)) return { [prefix || "value"]: displayActivityValue(value) };
  if (typeof value !== "object") return { [prefix || "value"]: displayActivityValue(value) };
  const output: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object" && !Array.isArray(item)) Object.assign(output, flattenActivityValue(item, path));
    else output[path] = displayActivityValue(item);
  }
  return output;
}

function displayActivityValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 240 ? `${text.slice(0, 237)}…` : text;
}

function activityFieldLabel(value: string): string {
  return value.replaceAll(".", " › ").replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function csv(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
