export const KPI_SOURCE_OPTIONS = [
  { value: "CARE_MANAGEMENT_SYSTEM", label: "Care management system" },
  { value: "QCGMS_MODULE", label: "QCGMS module or register" },
  { value: "ELECTRONIC_CALL_MONITORING", label: "Electronic call monitoring system" },
  { value: "WORKFORCE_SYSTEM", label: "Workforce or HR system" },
  { value: "AUDIT_OR_REVIEW", label: "Audit or quality review" },
  { value: "SURVEY_OR_FEEDBACK", label: "Survey or feedback tool" },
  { value: "CONTRACT_REPORT", label: "Contract or performance report" },
  { value: "UPLOADED_EVIDENCE", label: "Uploaded evidence record" },
  { value: "MONTHLY_PERFORMANCE_RETURN", label: "Monthly performance return" },
  { value: "OTHER_VERIFIED_SOURCE", label: "Other verified source" },
] as const;

export function normaliseKpiSourceType(value: unknown) {
  const input = String(value ?? "").trim();
  const match = KPI_SOURCE_OPTIONS.find(
    (option) => option.value === input || option.label.toLowerCase() === input.toLowerCase(),
  );
  if (!match) throw new Error("Choose where this figure came from.");
  return match.value;
}

export function kpiSourceLabel(value: string | null | undefined) {
  return KPI_SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? "Source not recorded";
}

export function normaliseKpiSourceUrl(value: unknown) {
  const input = String(value ?? "").trim();
  if (!input) return null;
  if (input.startsWith("/") && !input.startsWith("//")) return input;
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Enter a valid evidence link, including https://."); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Evidence links must use http or https.");
  return url.toString();
}

export function automatedKpiSource(slug: string) {
  if (slug.startsWith("scc-")) return { sourceType: "MONTHLY_PERFORMANCE_RETURN", sourceUrl: "/kpis/returns" };
  if (["open-actions", "overdue-actions"].includes(slug)) return { sourceType: "QCGMS_MODULE", sourceUrl: "/actions" };
  if (["training-compliance", "supervision-compliance", "appraisal-compliance", "spot-check-compliance"].includes(slug)) return { sourceType: "QCGMS_MODULE", sourceUrl: "/workforce" };
  if (slug === "audit-completion") return { sourceType: "QCGMS_MODULE", sourceUrl: "/audits" };
  if (slug === "policy-compliance") return { sourceType: "QCGMS_MODULE", sourceUrl: "/policies" };
  return { sourceType: "QCGMS_MODULE", sourceUrl: "/registers" };
}
