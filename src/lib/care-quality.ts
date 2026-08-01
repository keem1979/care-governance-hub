export type CareQualityArea = {
  key: string;
  title: string;
  description: string;
  href: string;
  createHref: string;
  registerKeys: readonly string[];
};

export const CARE_QUALITY_AREAS: readonly CareQualityArea[] = [
  { key: "assessment", title: "Assessment and consent", description: "Initial suitability, consent and person-centred assessment records before and during care.", href: "/assessments", createHref: "/registers/assessment-initial/new", registerKeys: ["assessment-initial", "assessment-consent-authority", "capacity-consent"] },
  { key: "care-plans", title: "Care plans and reviews", description: "Timely, person-centred care-plan review with involvement, agreed change and next review.", href: "/registers/care-plan-reviews", createHref: "/registers/care-plan-reviews/new", registerKeys: ["care-plan-reviews"] },
  { key: "risk-reviews", title: "Person-level risk reviews", description: "Reviews of changing risks and whether person-specific controls remain suitable.", href: "/registers/risk-assessment-reviews", createHref: "/registers/risk-assessment-reviews/new", registerKeys: ["risk-assessment-reviews"] },
  { key: "medicines", title: "Medicines and MAR assurance", description: "MAR audit, medicines support, errors, protocols, reconciliation and corrective action.", href: "/registers?group=medicines", createHref: "/registers/mar-audits/new", registerKeys: ["mar-audits", "medicines-errors", "medicines-support", "prn-protocols", "covert-medicines", "medicines-reconciliation"] },
  { key: "delegated-care", title: "Delegated healthcare", description: "Clinical delegation, current instructions, staff authorisation and practical competency review.", href: "/registers/delegated-healthcare", createHref: "/registers/delegated-healthcare/new", registerKeys: ["delegated-healthcare", "clinical-escalations"] },
  { key: "outcomes", title: "Outcomes and people’s experience", description: "Personal outcomes, feedback, satisfaction, complaints and evidence that people were heard.", href: "/registers/service-user-outcomes", createHref: "/registers/service-user-outcomes/new", registerKeys: ["service-user-outcomes", "satisfaction-surveys", "service-user-feedback", "complaints", "compliments"] },
  { key: "delivery", title: "Delivery and continuity", description: "Missed or late care, transitions and continuity arrangements that affect safe delivery.", href: "/registers?group=delivery", createHref: "/registers/call-log/new", registerKeys: ["missed-visits", "late-visits", "hospital-admissions", "call-log", "business-continuity"] },
  { key: "commissioning", title: "Commissioner assurance", description: "Contract obligations, submissions, feedback and performance issues connected to monthly KPIs.", href: "/registers/commissioner-contracts", createHref: "/registers/commissioner-contracts/new", registerKeys: ["commissioner-contracts"] },
] as const;

export const CARE_QUALITY_REGISTER_KEYS = [...new Set(CARE_QUALITY_AREAS.flatMap((area) => area.registerKeys))];
export const CARE_QUALITY_KPI_SLUGS = ["care-plan-reviews", "risk-assessments-reviewed", "mar-audit-compliance", "medication-errors", "missed-visits", "outcomes-achieved", "service-user-satisfaction", "complaints-responded-on-time", "business-continuity-test-compliance"] as const;

export function isQualityAttention(status: string, riskLevel: string) {
  void riskLevel;
  return !["CLOSED", "ARCHIVED"].includes(status);
}

export function qualityAreaForRegister(key: string) {
  return CARE_QUALITY_AREAS.find((area) => area.registerKeys.includes(key));
}

export function latestKpisBySlug<T extends { kpi: { slug: string }; reportingMonth: Date }>(entries: readonly T[]) {
  const result = new Map<string, T>();
  for (const entry of [...entries].sort((a, b) => b.reportingMonth.getTime() - a.reportingMonth.getTime())) if (!result.has(entry.kpi.slug)) result.set(entry.kpi.slug, entry);
  return result;
}
