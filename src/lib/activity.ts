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

export type ActivityFilters = {
  q?: string;
  action?: string;
  recordType?: string;
  userId?: string;
  locationId?: string;
  from?: Date;
  to?: Date;
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
    ...(single(query.action) ? { action: single(query.action) } : {}),
    ...(single(query.recordType) ? { recordType: single(query.recordType) } : {}),
    ...(single(query.user) ? { userId: single(query.user) } : {}),
    ...(requestedLocation && allowedLocations.includes(requestedLocation)
      ? { locationId: requestedLocation }
      : {}),
    ...(parseDate(query.from, false) ? { from: parseDate(query.from, false) } : {}),
    ...(parseDate(query.to, true) ? { to: parseDate(query.to, true) } : {}),
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
  };
  return routes[recordType] ? `/${routes[recordType]}/${recordId}` : null;
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
  const header = ["Date and time", "User", "Email", "Location", "Action", "Record type", "Record identifier", "Summary", "Before", "After"];
  const values = rows.map((row) => [
    row.createdAt.toISOString(),
    row.user?.name ?? "System",
    row.user?.email ?? "",
    row.location?.name ?? "Organisation-wide",
    row.action,
    row.recordType,
    row.recordId ?? "",
    row.summary,
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
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function csv(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
