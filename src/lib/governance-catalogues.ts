export type GovernanceSuggestion = {
  key: string;
  label: string;
  wording: string;
  categories?: string[];
  sources?: string[];
};

const COMMON_CONTROLS: GovernanceSuggestion[] = [
  { key: "policy", label: "Current policy or procedure", wording: "Current policy or procedure is available, version controlled and understood by the people responsible." },
  { key: "assessment", label: "Current assessment", wording: "A current assessment defines the risk, required controls and review triggers." },
  { key: "monitoring", label: "Monitoring and escalation", wording: "Named staff monitor agreed warning indicators and escalate threshold breaches to the accountable manager." },
  { key: "audit", label: "Audit or quality check", wording: "A scheduled audit or quality check tests whether the control is operating as intended." },
];

const CONTEXTUAL_CONTROLS: GovernanceSuggestion[] = [
  { key: "medicines-competency", label: "Medicines competency", wording: "Only staff with current medicines training and assessed competency undertake medicines support.", categories: ["Medicines"] },
  { key: "mar-audit", label: "MAR audit", wording: "MAR/eMAR records are reviewed through scheduled audit, with omissions and errors escalated.", categories: ["Medicines"] },
  { key: "safeguarding-pathway", label: "Safeguarding pathway", wording: "Immediate safety measures and the safeguarding escalation pathway are understood and available.", categories: ["Safeguarding"] },
  { key: "care-plan-review", label: "Care plan and risk review", wording: "The authorised care plan and relevant person-level risk assessments are current and reviewed after material change.", categories: ["Care quality", "Clinical", "Safeguarding"] },
  { key: "professional-input", label: "Professional input", wording: "Relevant professional advice is requested, recorded and incorporated into authorised care records.", categories: ["Care quality", "Clinical", "Medicines"] },
  { key: "workforce-assurance", label: "Workforce assurance", wording: "Staff induction, training, competency, supervision and spot checks are current for the work assigned.", categories: ["Workforce"] },
  { key: "continuity-plan", label: "Continuity arrangements", wording: "Business continuity arrangements define minimum safe service, escalation, communications and recovery ownership.", categories: ["Business continuity", "Operational"] },
  { key: "access-control", label: "Access and audit controls", wording: "Role-based access, audit logging and periodic access review protect information and system functions.", categories: ["Information governance", "Cyber security"] },
  { key: "equipment-check", label: "Equipment checks", wording: "Equipment inspection, maintenance and user competency are current and exceptions are escalated.", categories: ["Health and safety", "Clinical"] },
  { key: "commissioner-monitoring", label: "Contract monitoring", wording: "Contract requirements, return dates and commissioner actions are monitored through named ownership and evidence.", categories: ["Commissioner contract", "Compliance"] },
];

export const TREATMENT_SUGGESTIONS: GovernanceSuggestion[] = [
  { key: "update-care-plan", label: "Update care plan", wording: "Update the authorised care plan and confirm the change with relevant staff and the person/representative.", categories: ["Care quality", "Clinical", "Safeguarding", "Medicines"] },
  { key: "update-risk-assessment", label: "Update assessment", wording: "Review and update the connected risk assessment, controls and escalation thresholds." },
  { key: "professional-referral", label: "Professional referral", wording: "Make the appropriate professional referral, record advice received and track the outcome.", categories: ["Care quality", "Clinical", "Medicines"] },
  { key: "safeguarding-referral", label: "Safeguarding consideration", wording: "Record the authorised safeguarding decision and make/track a referral where required.", categories: ["Safeguarding", "Care quality"] },
  { key: "competency", label: "Competency reassessment", wording: "Reassess relevant staff competency and record supervision, support and any restriction pending assurance.", categories: ["Workforce", "Medicines", "Clinical"] },
  { key: "reaudit", label: "Re-audit effectiveness", wording: "Complete a proportionate re-audit after implementation and record whether improvement was sustained." },
  { key: "policy-review", label: "Review policy or procedure", wording: "Review the relevant policy or procedure, approve controlled changes and communicate them to affected staff." },
  { key: "increase-monitoring", label: "Increase monitoring", wording: "Introduce time-limited enhanced monitoring with a named owner, threshold and review date." },
  { key: "root-cause", label: "Root-cause review", wording: "Complete a proportionate root-cause review and link identified actions to the central Action Tracker." },
  { key: "external-notification", label: "Notification assessment", wording: "An authorised manager will assess and record whether regulator, commissioner or other external notification is required." },
];

export function controlSuggestions(category: string, sourceType: string) {
  const contextual = CONTEXTUAL_CONTROLS.filter((item) => applies(item, category, sourceType));
  return [...contextual, ...COMMON_CONTROLS].slice(0, 7);
}

export function treatmentSuggestions(category: string, sourceType: string) {
  return TREATMENT_SUGGESTIONS.filter((item) => applies(item, category, sourceType) || !item.categories?.length).slice(0, 7);
}

function applies(item: GovernanceSuggestion, category: string, sourceType: string) {
  return (!item.categories?.length || item.categories.includes(category)) && (!item.sources?.length || item.sources.includes(sourceType));
}
