import {
  calculateKpiReturnSummary,
  KPI_RETURN_FIELDS,
  numberValue,
  type KpiReturnData,
} from "@/lib/kpi-suite";

export const COMMISSIONER_KPI_SOURCE = "Monthly service performance return";

export const COMMISSIONER_KPI_FIELD_KEYS = [
  "pocsEnded",
  "pocsHandedBack",
  "totalCalls",
  "lateCalls",
  "missedCalls",
  "rescheduledCalls",
  "providerCancelledCalls",
  "serviceUserCancelledCalls",
  "serviceUserCancelledUnder24h",
  "restartsOffered",
  "eligibleRestartsTaken",
  "referralsAccepted",
  "referralsRejected",
  "referralsPositiveResponse",
  "referralsNegativeResponse",
  "referralsNoResponse",
  "pocsStarted",
  "pocsAwarded",
  "activePocsMonthEnd",
  "liveInPocsEnded",
  "liveInPocsHandedBack",
  "liveInBreakPeriodsDelivered",
  "liveInBreakPeriodsNotRequired",
  "activeLiveInStaff",
  "liveInStaffSupervised",
  "staffMonthEnd",
  "newDirectCareStaff",
  "newBackOfficeStaff",
  "staffLeft",
  "orientationEligible",
  "orientationCompleted",
  "careCertificateValid",
  "sponsoredStaffSurrey",
  "complaintsReceived",
  "complaintsUpheld",
  "complaintsNotUpheld",
  "complaintsOpen",
  "complaintsClosed",
  "safeguardingReferrals",
  "section42Enquiries",
  "section42RiskPresent",
  "section42NoRisk",
  "section42Open",
] as const;

export type CommissionerKpiFieldKey = (typeof COMMISSIONER_KPI_FIELD_KEYS)[number];

export const COMMISSIONER_CALCULATED_KPIS = [
  { slug: "scc-call-exception-rate", name: "Auto calc — call exception rate", summaryKey: "providerExceptionRate" },
  { slug: "scc-restart-acceptance-rate", name: "Auto calc — successful restarts", summaryKey: "restartAcceptanceRate" },
  { slug: "scc-new-staff-rate", name: "Auto calc — new staff rate", summaryKey: "staffJoinerRate" },
  { slug: "scc-care-certificate-rate", name: "Auto calc — valid Care Certificate", summaryKey: "careCertificateRate" },
  { slug: "scc-referral-response-rate", name: "KPI 4 — referral response rate", summaryKey: "referralResponseRate" },
] as const;

export const SYSTEM_CALCULATED_KPIS = [
  { slug: "visits-within-agreed-time", name: "Visits delivered within the agreed time", summaryKey: "successfulDeliveryRate", source: "Total, late, missed, rescheduled and cancelled care calls" },
  { slug: "orientation-completion-rate", name: "Orientation completion rate", summaryKey: "orientationCompletionRate", source: "Staff eligible for and due to complete orientation" },
  { slug: "live-in-supervision-rate", name: "Live-in staff supervision rate", summaryKey: "liveInSupervisionRate", source: "Active and supervised live-in staff" },
  { slug: "competency-compliance", name: "Staff competency compliance", summaryKey: "competencyCompletionRate", source: "Competency checks due and completed" },
  { slug: "complaint-closure-rate", name: "Complaint closure rate", summaryKey: "complaintClosureRate", source: "Open and closed complaints" },
] as const;

export const AUTO_CALCULATED_KPIS = [
  ...COMMISSIONER_CALCULATED_KPIS.map((item) => ({ ...item, source: "Monthly performance inputs" })),
  ...SYSTEM_CALCULATED_KPIS,
] as const;

export const AUTO_CALCULATED_KPI_SLUGS = AUTO_CALCULATED_KPIS.map((item) => item.slug);

export function isAutoCalculatedKpi(slug: string) {
  return AUTO_CALCULATED_KPI_SLUGS.includes(slug as (typeof AUTO_CALCULATED_KPI_SLUGS)[number]);
}

export function autoCalculatedKpiSource(slug: string) {
  return AUTO_CALCULATED_KPIS.find((item) => item.slug === slug)?.source;
}

export function commissionerFieldSlug(key: string) {
  return `scc-${key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

export const COMMISSIONER_KPI_SLUGS = [
  ...COMMISSIONER_KPI_FIELD_KEYS.map(commissionerFieldSlug),
  ...COMMISSIONER_CALCULATED_KPIS.map((item) => item.slug),
];

export const KPI_RETURN_SYNC_SLUGS = [
  ...COMMISSIONER_KPI_FIELD_KEYS.map(commissionerFieldSlug),
  ...AUTO_CALCULATED_KPI_SLUGS,
];

export function commissionerKpiValues(data: KpiReturnData): Map<string, number> {
  const values = new Map<string, number>();
  for (const key of COMMISSIONER_KPI_FIELD_KEYS) values.set(commissionerFieldSlug(key), numberValue(data, key));
  const summary = calculateKpiReturnSummary(data);
  for (const item of AUTO_CALCULATED_KPIS) {
    const value = summary[item.summaryKey];
    if (value !== null) values.set(item.slug, value);
  }
  return values;
}

export function commissionerKpiCoverage() {
  const fieldSet = new Set<string>(COMMISSIONER_KPI_FIELD_KEYS);
  const fields = KPI_RETURN_FIELDS.filter((field) => fieldSet.has(field.key));
  return {
    numericInputs: fields.length,
    calculatedMeasures: COMMISSIONER_CALCULATED_KPIS.length,
    nonNumericItems: 1,
    totalItems: fields.length + COMMISSIONER_CALCULATED_KPIS.length + 1,
  };
}
