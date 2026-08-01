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
      { key: "pocsEnded", label: "Packages of care ended" },
      { key: "pocsHandedBack", label: "Packages handed back" },
      { key: "totalCalls", label: "Total care calls delivered" },
      { key: "lateCalls", label: "Late care calls", help: "Use your organisation’s agreed definition of a late call." },
      { key: "missedCalls", label: "Missed care calls" },
      { key: "rescheduledCalls", label: "Rescheduled care calls" },
      { key: "providerCancelledCalls", label: "Calls cancelled by the provider" },
      { key: "serviceUserCancelledCalls", label: "Calls cancelled by the person receiving care" },
      { key: "serviceUserCancelledUnder24h", label: "Short-notice cancellations" },
    ],
  },
  {
    key: "capacity",
    title: "Restarts and capacity",
    description: "Track restart offers, take-up, referrals and service capacity.",
    fields: [
      { key: "restartsOffered", label: "Restarts offered" },
      { key: "eligibleRestartsTaken", label: "Eligible restarts accepted" },
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
      { key: "liveInPocsEnded", label: "Live-in packages ended" },
      { key: "liveInPocsHandedBack", label: "Live-in packages handed back" },
      { key: "liveInBreakPeriodsDelivered", label: "Live-in break periods delivered" },
      { key: "liveInBreakPeriodsNotRequired", label: "Break periods not required" },
      { key: "activeLiveInStaff", label: "Active live-in care staff" },
      { key: "liveInStaffSupervised", label: "Live-in staff supervised" },
    ],
  },
  {
    key: "workforce",
    title: "Workforce and competence",
    description: "Staffing movement, orientation, Care Certificate and sponsorship.",
    fields: [
      { key: "staffMonthEnd", label: "Total staff at month end" },
      { key: "newDirectCareStaff", label: "New direct-care staff" },
      { key: "newBackOfficeStaff", label: "New office and management staff" },
      { key: "staffLeft", label: "Staff who left" },
      { key: "orientationEligible", label: "New staff eligible for orientation" },
      { key: "orientationCompleted", label: "New staff due to complete orientation" },
      { key: "careCertificateValid", label: "Staff with a valid Care Certificate" },
      { key: "competenciesDue", label: "Competency checks due or overdue" },
      { key: "competenciesCompleted", label: "Competency checks completed" },
      { key: "sponsoredStaffSurrey", label: "Sponsored staff in active roles" },
    ],
  },
  {
    key: "quality",
    title: "Complaints and safeguarding",
    description: "Monthly case volumes, outcomes and outstanding work.",
    fields: [
      { key: "complaintsReceived", label: "Complaints received" },
      { key: "complaintsUpheld", label: "Complaints upheld" },
      { key: "complaintsNotUpheld", label: "Complaints not upheld" },
      { key: "complaintsOpen", label: "Complaints open or pending" },
      { key: "complaintsClosed", label: "Complaints closed" },
      { key: "safeguardingReferrals", label: "Safeguarding referrals" },
      { key: "section42Enquiries", label: "Safeguarding enquiries" },
      { key: "section42RiskPresent", label: "Safeguarding outcomes: risk identified" },
      { key: "section42NoRisk", label: "Safeguarding outcomes: no risk identified" },
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
