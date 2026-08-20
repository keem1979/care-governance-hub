export const AUDIT_STATUSES = ["DRAFT","IN_PROGRESS","AWAITING_REVIEW","COMPLETED","CLOSED","ARCHIVED"] as const;
export const COMPLIANCE_ANSWERS = ["COMPLIANT","PARTIALLY_COMPLIANT","NON_COMPLIANT","NOT_APPLICABLE"] as const;

export function auditQuickStartSample(templateKey: string): { method: string; size: number } {
  return templateKey === "business-continuity-audit" ? { method: "FULL_POPULATION", size: 1 } : { method: "RISK_AND_RANDOM", size: 5 };
}

export const AUDIT_EVIDENCE_SOURCE_OPTIONS = [
  { group: "Controlled governance", value: "EVIDENCE_LIBRARY", label: "Evidence Library controlled record" },
  { group: "Controlled governance", value: "POLICY_PROCEDURE", label: "Policy, procedure or controlled document" },
  { group: "Controlled governance", value: "AUDIT_SPOT_CHECK", label: "Audit, quality check or spot check" },
  { group: "Controlled governance", value: "RISK_REGISTER", label: "Risk assessment or risk register" },
  { group: "Controlled governance", value: "ACTION_EFFECTIVENESS", label: "Action, verification or effectiveness review" },
  { group: "People and care", value: "CARE_PLAN_REVIEW", label: "Care plan, care-plan review or daily record" },
  { group: "People and care", value: "ASSESSMENT_CONSENT", label: "Assessment, consent or capacity record" },
  { group: "People and care", value: "MEDICINES_MAR", label: "Medicines, MAR or delegated-healthcare record" },
  { group: "People and care", value: "PEOPLE_FEEDBACK", label: "Person, representative or advocate feedback" },
  { group: "Safety and response", value: "INCIDENT_NEAR_MISS", label: "Incident, accident or near-miss record" },
  { group: "Safety and response", value: "COMPLAINT_COMPLIMENT", label: "Complaint, concern, compliment or response" },
  { group: "Safety and response", value: "SAFEGUARDING", label: "Safeguarding concern, referral or outcome" },
  { group: "Safety and response", value: "BUSINESS_CONTINUITY", label: "BCP, exercise, activation or recovery record" },
  { group: "Workforce", value: "WORKFORCE_HR", label: "Staff file, recruitment or HR record" },
  { group: "Workforce", value: "TRAINING_COMPETENCY", label: "Training, competency, supervision or appraisal" },
  { group: "Workforce", value: "STAFF_FEEDBACK", label: "Staff interview, survey, meeting or concern" },
  { group: "Performance and oversight", value: "KPI_PERFORMANCE", label: "KPI, dashboard or performance return" },
  { group: "Performance and oversight", value: "GOVERNANCE_MEETING", label: "Governance meeting, decision or minutes" },
  { group: "Performance and oversight", value: "CALL_COMMUNICATION", label: "Call log, communication or correspondence" },
  { group: "Performance and oversight", value: "CQC_NOTIFICATION", label: "CQC notification, inspection or regulatory record" },
  { group: "External and observation", value: "COMMISSIONER_CONTRACT", label: "Commissioner, contract or quality-monitoring record" },
  { group: "External and observation", value: "OBSERVATION_SITE_CHECK", label: "Direct observation, premises or equipment check" },
  { group: "External and observation", value: "EXTERNAL_PARTNER", label: "Health professional, supplier or partner evidence" },
  { group: "External and observation", value: "OTHER_VERIFIED_SOURCE", label: "Other verified source" },
] as const;

export function auditEvidenceSourceLabel(value: string | null): string | null {
  return AUDIT_EVIDENCE_SOURCE_OPTIONS.find((item) => item.value === value)?.label ?? value?.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()) ?? null;
}

export function hasTraceableAuditEvidence(input: { evidenceId?: string | null; evidenceSourceType?: string | null; evidenceSourceReference?: string | null }): boolean {
  return Boolean(input.evidenceId || (input.evidenceSourceType && input.evidenceSourceReference?.trim().length && input.evidenceSourceReference.trim().length >= 3));
}

export function scoreAnswer(answer: string | null): number | null {
  if (answer === "COMPLIANT" || answer === "YES") return 100;
  if (answer === "PARTIALLY_COMPLIANT") return 50;
  if (answer === "NON_COMPLIANT" || answer === "NO") return 0;
  return null;
}

export function calculateAuditScore(responses: Array<{ score: number | null; weighting: number }>): number | null {
  const scored = responses.filter((item) => item.score !== null);
  if (!scored.length) return null;
  const totalWeight = scored.reduce((sum,item) => sum + Math.max(1,item.weighting),0);
  return Math.round((scored.reduce((sum,item) => sum + (item.score ?? 0) * Math.max(1,item.weighting),0) / totalWeight) * 10) / 10;
}

export function auditStatusLabel(status: string): string {
  return status.replaceAll("_"," ").toLowerCase().replace(/^\w/, (value) => value.toUpperCase());
}

export function auditScopeWhere(context: { organisation:{id:string}; allLocations:boolean; locations:{id:string}[] }) {
  return { organisationId: context.organisation.id, ...(context.allLocations ? {} : { locationId: { in: context.locations.map((item)=>item.id) } }) };
}
