export const REPORT_DEFINITIONS = {
  "monthly-governance": {
    title: "Monthly governance report",
    description: "A cross-module view of audits, risks, actions and KPI performance.",
    sources: ["AUDIT", "RISK", "ACTION", "KPI"],
  },
  "quality-assurance": {
    title: "Quality assurance report",
    description: "Audit outcomes, improvement actions and KPI performance.",
    sources: ["AUDIT", "ACTION", "KPI"],
  },
  audit: {
    title: "Audit report",
    description: "Completed and in-progress audits, scores and findings.",
    sources: ["AUDIT"],
  },
  risk: {
    title: "Risk report",
    description: "Current organisational and location risks and controls.",
    sources: ["RISK"],
  },
  "action-status": {
    title: "Action status report",
    description: "Action ownership, priorities, due dates and closure evidence.",
    sources: ["ACTION"],
  },
  complaints: {
    title: "Complaints report",
    description: "Complaint register records and their current status.",
    sources: ["COMPLAINT"],
  },
  incidents: {
    title: "Incident report",
    description: "Incident register records, risk levels and outcomes.",
    sources: ["INCIDENT"],
  },
  safeguarding: {
    title: "Safeguarding report",
    description: "Safeguarding register records and governance follow-up.",
    sources: ["SAFEGUARDING"],
  },
  "policy-compliance": {
    title: "Policy compliance report",
    description: "Policy approval, review and publication status.",
    sources: ["POLICY"],
  },
  kpi: {
    title: "KPI report",
    description: "Recorded KPI results, targets and RAG status.",
    sources: ["KPI"],
  },
  "inspection-readiness": {
    title: "Inspection-readiness report",
    description: "Internal evidence coverage against configured requirements.",
    sources: ["INSPECTION"],
  },
  "evidence-index": {
    title: "Evidence index",
    description: "A searchable index of evidence records and review dates.",
    sources: ["EVIDENCE"],
  },
  "board-summary": {
    title: "Board summary report",
    description: "A concise executive view of assurance, risk and improvement activity.",
    sources: ["AUDIT", "RISK", "ACTION", "KPI"],
  },
} as const;

export type ReportType = keyof typeof REPORT_DEFINITIONS;

export type ReportFilters = {
  from?: Date;
  to?: Date;
  locationId?: string;
  status?: string;
  category?: string;
  appendices: boolean;
};

export type ReportRow = {
  type: string;
  reference: string;
  title: string;
  date: string;
  location: string;
  category: string;
  status: string;
  owner: string;
  detail: string;
};

export function isReportType(value: string): value is ReportType {
  return Object.hasOwn(REPORT_DEFINITIONS, value);
}

export function parseReportFilters(
  query: Record<string, string | string[] | undefined>,
  allowedLocations: readonly string[],
): ReportFilters {
  const from = parseDate(query.from, false);
  const to = parseDate(query.to, true);
  const requestedLocation = single(query.location);
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(requestedLocation && allowedLocations.includes(requestedLocation)
      ? { locationId: requestedLocation }
      : {}),
    ...(single(query.status) ? { status: single(query.status) } : {}),
    ...(single(query.category) ? { category: single(query.category) } : {}),
    appendices: single(query.appendices) === "true",
  };
}

export function reportQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", dateKey(filters.from));
  if (filters.to) params.set("to", dateKey(filters.to));
  if (filters.locationId) params.set("location", filters.locationId);
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.appendices) params.set("appendices", "true");
  return params.toString();
}

export function filterReportRows(rows: ReportRow[], filters: ReportFilters): ReportRow[] {
  return rows.filter((row) => {
    const recordDate = new Date(`${row.date}T12:00:00Z`);
    if (filters.from && recordDate < filters.from) return false;
    if (filters.to && recordDate > filters.to) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.category && row.category !== filters.category) return false;
    return true;
  });
}

export function reportCsv(rows: ReportRow[]): string {
  const header = ["Record type", "Reference", "Title", "Date", "Location", "Category", "Status", "Owner", "Detail"];
  return `\uFEFF${[header, ...rows.map((row) => [
    row.type,
    row.reference,
    row.title,
    row.date,
    row.location,
    row.category,
    row.status,
    row.owner,
    row.detail,
  ])].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function label(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseDate(value: string | string[] | undefined, endOfDay: boolean): Date | undefined {
  const text = single(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const parsed = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
