export const KPI_DIRECTIONS = ["HIGHER_IS_BETTER", "LOWER_IS_BETTER"] as const;
export const KPI_RAG_STATUSES = ["GREEN", "AMBER", "RED"] as const;

export function kpiLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function calculateKpiRag(input: {
  actual: number;
  direction: string;
  greenThreshold: number;
  amberThreshold: number;
}) {
  const { actual, direction, greenThreshold, amberThreshold } = input;
  if (![actual, greenThreshold, amberThreshold].every(Number.isFinite)) throw new Error("KPI values must be valid numbers.");
  validateThresholds(direction, greenThreshold, amberThreshold);
  if (direction === "HIGHER_IS_BETTER") return actual >= greenThreshold ? "GREEN" : actual >= amberThreshold ? "AMBER" : "RED";
  if (direction === "LOWER_IS_BETTER") return actual <= greenThreshold ? "GREEN" : actual <= amberThreshold ? "AMBER" : "RED";
  throw new Error("Choose a valid KPI direction.");
}

export function validateThresholds(direction: string, green: number, amber: number) {
  if (direction === "HIGHER_IS_BETTER" && green < amber) throw new Error("For higher-is-better KPIs, the green threshold must be at least the amber threshold.");
  if (direction === "LOWER_IS_BETTER" && green > amber) throw new Error("For lower-is-better KPIs, the green threshold must not exceed the amber threshold.");
}

export function parseKpiMonth(value: FormDataEntryValue | string | null) {
  const text = String(value ?? "");
  if (!/^\d{4}-\d{2}$/.test(text)) throw new Error("Enter a valid reporting month.");
  const date = new Date(`${text}-01T12:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) throw new Error("Enter a valid reporting month.");
  return date;
}

export function monthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

export function addMonths(value: Date, count: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + count, 1, 12));
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index], next = text[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index++;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function ragClasses(status: string) {
  return status === "GREEN" ? "bg-emerald-100 text-emerald-800" : status === "AMBER" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800";
}
