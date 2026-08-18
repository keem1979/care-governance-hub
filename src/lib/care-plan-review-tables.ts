export type StructuredTableFieldType =
  | "text"
  | "textarea"
  | "date"
  | "datetime-local"
  | "select"
  | "checkbox";

export type StructuredTableColumn = {
  key: string;
  label: string;
  type?: StructuredTableFieldType;
  options?: readonly string[];
  placeholder?: string;
  width?: "compact" | "standard" | "wide";
};

export type StructuredTableRow = Record<string, string>;

export const escalationTableColumns: StructuredTableColumn[] = [
  { key: "trigger", label: "Trigger / concern", type: "textarea", width: "wide", placeholder: "What change or concern starts this response?" },
  { key: "severity", label: "Severity", type: "select", options: ["Monitor", "Low", "Medium", "High", "Critical / emergency"], width: "standard" },
  { key: "immediateAction", label: "Immediate action", type: "textarea", width: "wide", placeholder: "What staff must do immediately" },
  { key: "contact", label: "Who to contact", width: "standard", placeholder: "Role, service and contact route" },
  { key: "timescale", label: "Response timescale", width: "standard", placeholder: "Immediately / within 1 hour" },
  { key: "information", label: "Information to provide", type: "textarea", width: "wide" },
  { key: "followUp", label: "Follow-up responsibility", width: "standard" },
  { key: "outcomeEvidence", label: "Outcome evidence", type: "textarea", width: "wide", placeholder: "Record, observation or confirmation required" },
];

export const outcomeTableColumns: StructuredTableColumn[] = [
  { key: "outcome", label: "Outcome", type: "textarea", width: "wide", placeholder: "Person-centred outcome being reviewed" },
  { key: "previousStatus", label: "Previous position", type: "textarea", width: "wide" },
  { key: "progress", label: "Current progress", type: "select", options: ["Achieved", "On track", "Partly achieved", "Not achieved", "Deteriorated", "Not yet measurable"], width: "standard" },
  { key: "evidence", label: "Evidence reviewed", type: "textarea", width: "wide" },
  { key: "personView", label: "Person’s view", type: "textarea", width: "wide" },
  { key: "decision", label: "Decision", type: "select", options: ["Continue", "Amend", "Close", "Escalate"], width: "standard" },
  { key: "newTarget", label: "New target / next step", type: "textarea", width: "wide" },
  { key: "reviewDate", label: "Review date", type: "date", width: "standard" },
];

export const agreedChangeTableColumns: StructuredTableColumn[] = [
  { key: "area", label: "Care-plan area", width: "standard" },
  { key: "previousPosition", label: "Previous position", type: "textarea", width: "wide" },
  { key: "newPosition", label: "New agreed position", type: "textarea", width: "wide" },
  { key: "reason", label: "Reason for change", type: "textarea", width: "wide" },
  { key: "riskImpact", label: "Risk impact", type: "select", options: ["Reduces risk", "No material change", "May increase risk", "Requires assessment"], width: "standard" },
  { key: "effectiveDate", label: "Effective date", type: "date", width: "standard" },
  { key: "approvedBy", label: "Approved by", width: "standard" },
];

export const readUnderstoodTableColumns: StructuredTableColumn[] = [
  { key: "staffMember", label: "Staff member", width: "standard", placeholder: "Full name" },
  { key: "role", label: "Role", width: "standard" },
  { key: "sent", label: "Sent", type: "checkbox", width: "compact" },
  { key: "read", label: "Read", type: "checkbox", width: "compact" },
  { key: "understood", label: "Understanding confirmed", type: "checkbox", width: "compact" },
  { key: "confirmedAt", label: "Confirmed date / time", type: "datetime-local", width: "standard" },
  { key: "outstanding", label: "Outstanding support / follow-up", type: "textarea", width: "wide" },
];

export const competencyTableColumns: StructuredTableColumn[] = [
  { key: "staffMember", label: "Staff member", width: "standard" },
  { key: "role", label: "Role", width: "standard" },
  { key: "competency", label: "Competency / skill", type: "textarea", width: "wide" },
  { key: "method", label: "Assessment method", type: "select", options: ["Direct observation", "Knowledge check", "Simulation", "Supervised practice", "Evidence review", "Other"], width: "standard" },
  { key: "assessedBy", label: "Assessed by", width: "standard" },
  { key: "assessmentDate", label: "Assessment date", type: "date", width: "standard" },
  { key: "outcome", label: "Outcome", type: "select", options: ["Competent", "Competent with support", "Further assessment required", "Not yet competent"], width: "standard" },
  { key: "reviewDate", label: "Review date", type: "date", width: "standard" },
  { key: "evidence", label: "Evidence / reference", type: "textarea", width: "wide" },
];

export const supervisionTableColumns: StructuredTableColumn[] = [
  { key: "staffMember", label: "Staff member", width: "standard" },
  { key: "role", label: "Role", width: "standard" },
  { key: "sessionDate", label: "Session date", type: "date", width: "standard" },
  { key: "supervisor", label: "Supervisor", width: "standard" },
  { key: "topic", label: "Reason / topic", type: "textarea", width: "wide" },
  { key: "actions", label: "Agreed support / actions", type: "textarea", width: "wide" },
  { key: "dueDate", label: "Due date", type: "date", width: "standard" },
  { key: "completed", label: "Completed", type: "checkbox", width: "compact" },
  { key: "followUpDate", label: "Follow-up date", type: "date", width: "standard" },
];

export function emptyStructuredTableRow(columns: readonly StructuredTableColumn[]): StructuredTableRow {
  return Object.fromEntries(columns.map((column) => [column.key, ""]));
}

export function structuredTableRowHasValue(row: StructuredTableRow) {
  return Object.values(row).some((value) => String(value).trim() !== "");
}

export function parseStructuredTable(
  value: unknown,
  columns: readonly StructuredTableColumn[],
): StructuredTableRow[] {
  if (Array.isArray(value)) {
    return value.map((row) => normaliseRow(row, columns)).filter(structuredTableRowHasValue);
  }

  const text = String(value ?? "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((row) => normaliseRow(row, columns)).filter(structuredTableRowHasValue);
    }
  } catch {
    // Older reviews stored table-shaped text. It is migrated in memory below.
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean))
    .filter((cells, index) => index !== 0 || !looksLikeHeader(cells, columns))
    .map((cells) => Object.fromEntries(columns.map((column, index) => [column.key, cells[index] ?? ""])))
    .filter(structuredTableRowHasValue);
}

function normaliseRow(value: unknown, columns: readonly StructuredTableColumn[]) {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(columns.map((column) => [column.key, String(row[column.key] ?? "")]));
}

function looksLikeHeader(cells: string[], columns: readonly StructuredTableColumn[]) {
  const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const labels = new Set(columns.map((column) => normalise(column.label)));
  const matches = cells.filter((cell) => labels.has(normalise(cell))).length;
  return matches >= Math.min(2, columns.length);
}
