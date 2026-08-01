export type KpiReturnData = Record<string, number | string>;

export type KpiField = {
  key: string;
  code?: string;
  label: string;
  help?: string;
};

export type KpiSection = {
  key: string;
  title: string;
  description: string;
  fields: KpiField[];
};

export const KPI_RETURN_SECTIONS: KpiSection[] = [
  {
    key: "service",
    title: "Home-care delivery",
    description: "Monthly delivery, delays and call exceptions.",
    fields: [
      { key: "pocsEnded", code: "2.1a", label: "Packages of care ended" },
      { key: "pocsHandedBack", code: "2.1b", label: "Packages handed back" },
      { key: "totalCalls", code: "2.2a", label: "Total scheduled calls" },
      { key: "lateCalls", code: "2.3a", label: "Late calls", help: "Use the local authority’s current definition of late." },
      { key: "missedCalls", code: "3.3b", label: "Missed calls", help: "Code retained exactly as supplied in the 2026 workbook." },
      { key: "rescheduledCalls", code: "2.3c", label: "Rescheduled calls" },
      { key: "providerCancelledCalls", code: "2.3d", label: "Calls cancelled by provider" },
      { key: "serviceUserCancelledCalls", code: "2.3f", label: "Calls cancelled by service user" },
      { key: "serviceUserCancelledUnder24h", code: "2.3g", label: "Service-user cancellations within 24 hours" },
    ],
  },
  {
    key: "capacity",
    title: "Restarts and capacity",
    description: "Track restart offers, take-up and commissioner referrals.",
    fields: [
      { key: "restartsOffered", code: "3.1a", label: "Restarts offered" },
      { key: "eligibleRestartsTaken", code: "3.1b", label: "Eligible restarts accepted" },
      { key: "referralsAccepted", label: "eBrokerage referrals accepted" },
      { key: "referralsRejected", label: "eBrokerage referrals rejected" },
      { key: "referralsPositiveResponse", label: "POC requests answered positively" },
      { key: "referralsNegativeResponse", label: "POC requests answered negatively" },
      { key: "referralsNoResponse", label: "POC requests with no response" },
      { key: "pocsStarted", label: "Packages of care started" },
      { key: "pocsAwarded", label: "Packages of care awarded" },
      { key: "activePocsMonthEnd", label: "Active packages at month end" },
    ],
  },
  {
    key: "liveIn",
    title: "Live-in care",
    description: "Live-in packages, breaks and staff supervision.",
    fields: [
      { key: "liveInPocsEnded", code: "4.1a", label: "Live-in packages ended" },
      { key: "liveInPocsHandedBack", code: "4.1b", label: "Live-in packages handed back" },
      { key: "liveInBreakPeriodsDelivered", code: "4.2a", label: "24-hour break periods delivered" },
      { key: "liveInBreakPeriodsNotRequired", code: "4.2b", label: "Break periods not required" },
      { key: "activeLiveInStaff", code: "4.3a", label: "Active live-in care staff" },
      { key: "liveInStaffSupervised", code: "4.3b", label: "Live-in staff supervised" },
    ],
  },
  {
    key: "workforce",
    title: "Workforce and competence",
    description: "Staffing movement, orientation, Care Certificate and sponsorship.",
    fields: [
      { key: "staffMonthEnd", code: "5.1a", label: "Total staff at month end" },
      { key: "newDirectCareStaff", code: "5.1b", label: "New direct-care staff" },
      { key: "newBackOfficeStaff", code: "5.1c", label: "New office and management staff" },
      { key: "staffLeft", code: "5.1d", label: "Staff who left" },
      { key: "orientationEligible", code: "5.2a", label: "Staff eligible for orientation" },
      { key: "orientationCompleted", code: "5.2b", label: "New staff due to complete orientation training" },
      { key: "careCertificateValid", code: "5.2c", label: "Staff with valid Care Certificate" },
      { key: "competenciesDue", label: "Competency checks due or overdue" },
      { key: "competenciesCompleted", label: "Competency checks completed" },
      { key: "sponsoredStaffSurrey", code: "6.1a", label: "Sponsored staff working in the authority area" },
    ],
  },
  {
    key: "quality",
    title: "Complaints and safeguarding",
    description: "Monthly case volumes, outcomes and outstanding work.",
    fields: [
      { key: "complaintsReceived", code: "7.1a", label: "Complaints received" },
      { key: "complaintsUpheld", code: "7.1b", label: "Complaints upheld" },
      { key: "complaintsNotUpheld", code: "7.1c", label: "Complaints not upheld" },
      { key: "complaintsOpen", code: "7.1d", label: "Complaints open or pending" },
      { key: "complaintsClosed", code: "7.1e", label: "Complaints closed" },
      { key: "safeguardingReferrals", code: "8.1a", label: "Safeguarding referrals" },
      { key: "section42Enquiries", code: "8.1b", label: "Section 42 enquiries" },
      { key: "section42RiskPresent", code: "8.1c", label: "Section 42 outcomes: risk present" },
      { key: "section42NoRisk", code: "8.1d", label: "Section 42 outcomes: no risk" },
      { key: "section42Open", label: "Section 42 enquiries open or pending" },
    ],
  },
];

export const KPI_RETURN_FIELDS = KPI_RETURN_SECTIONS.flatMap((section) => section.fields);

export function numberValue(data: KpiReturnData, key: string) {
  const value = Number(data[key] ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function percentage(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function calculateKpiReturnSummary(data: KpiReturnData) {
  const totalCalls = numberValue(data, "totalCalls");
  const providerExceptions = [
    "lateCalls",
    "missedCalls",
    "rescheduledCalls",
    "providerCancelledCalls",
    "serviceUserCancelledCalls",
  ]
    .reduce((sum, key) => sum + numberValue(data, key), 0);
  const referralsAnswered = numberValue(data, "referralsPositiveResponse") + numberValue(data, "referralsNegativeResponse");
  const referralRequests = referralsAnswered + numberValue(data, "referralsNoResponse");
  const complaintsWorkload = numberValue(data, "complaintsClosed") + numberValue(data, "complaintsOpen");
  return {
    successfulDeliveryRate: percentage(Math.max(0, totalCalls - providerExceptions), totalCalls),
    providerExceptionRate: percentage(providerExceptions, totalCalls),
    restartAcceptanceRate: percentage(numberValue(data, "eligibleRestartsTaken"), numberValue(data, "restartsOffered")),
    referralResponseRate: percentage(referralsAnswered, referralRequests),
    staffJoinerRate: percentage(numberValue(data, "newDirectCareStaff") + numberValue(data, "newBackOfficeStaff"), numberValue(data, "staffMonthEnd")),
    orientationCompletionRate: percentage(numberValue(data, "orientationCompleted"), numberValue(data, "orientationEligible")),
    careCertificateRate: percentage(numberValue(data, "careCertificateValid"), numberValue(data, "staffMonthEnd")),
    liveInSupervisionRate: percentage(numberValue(data, "liveInStaffSupervised"), numberValue(data, "activeLiveInStaff")),
    competencyCompletionRate: percentage(numberValue(data, "competenciesCompleted"), numberValue(data, "competenciesDue")),
    complaintClosureRate: percentage(numberValue(data, "complaintsClosed"), complaintsWorkload),
  };
}

export function validateKpiReturn(data: KpiReturnData) {
  const errors: string[] = [];
  for (const field of KPI_RETURN_FIELDS) {
    const value = data[field.key];
    if (value !== undefined && value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      errors.push(`${field.label} must be zero or a positive number.`);
    }
  }
  const atMost = (child: string, parent: string, message: string) => {
    if (numberValue(data, child) > numberValue(data, parent)) errors.push(message);
  };
  atMost("serviceUserCancelledUnder24h", "serviceUserCancelledCalls", "Cancellations within 24 hours cannot exceed all service-user cancellations.");
  atMost("eligibleRestartsTaken", "restartsOffered", "Accepted restarts cannot exceed restarts offered.");
  atMost("liveInStaffSupervised", "activeLiveInStaff", "Supervised live-in staff cannot exceed active live-in staff.");
  atMost("orientationCompleted", "orientationEligible", "Completed orientations cannot exceed eligible staff.");
  atMost("careCertificateValid", "staffMonthEnd", "Valid Care Certificates cannot exceed total staff.");
  if (numberValue(data, "complaintsUpheld") + numberValue(data, "complaintsNotUpheld") > numberValue(data, "complaintsClosed")) {
    errors.push("Complaint outcomes cannot exceed complaints closed.");
  }
  if (numberValue(data, "section42RiskPresent") + numberValue(data, "section42NoRisk") > numberValue(data, "section42Enquiries")) {
    errors.push("Section 42 outcomes cannot exceed Section 42 enquiries.");
  }
  return errors;
}

export function parseKpiReturnForm(form: FormData): KpiReturnData {
  return Object.fromEntries(KPI_RETURN_FIELDS.map((field) => {
    const value = String(form.get(field.key) ?? "").trim();
    return [field.key, value === "" ? 0 : Number(value)];
  }));
}

export function formatRate(value: number | null) {
  return value === null ? "Not available" : `${value}%`;
}
