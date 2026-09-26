import { managementAssuranceTest } from "@/lib/management-assurance";
import { ROLE_KEYS } from "@/lib/permissions";

export const COMPLAINT_FINDINGS = ["UPHELD", "PARTLY_UPHELD", "NOT_UPHELD", "INCONCLUSIVE", "WITHDRAWN"] as const;
export const COMPLAINT_COMMUNICATION_TYPES = ["ACKNOWLEDGEMENT", "PROGRESS_UPDATE", "INFORMATION_REQUEST", "EXTENSION", "TELEPHONE_DISCUSSION", "MEETING", "CORRESPONDENCE_SENT", "FINAL_RESPONSE", "POST_RESPONSE", "OTHER"] as const;
export const COMPLAINT_COMMUNICATION_DIRECTIONS = ["INBOUND", "OUTBOUND", "MUTUAL", "INTERNAL"] as const;
export const COMPLAINT_LEARNING_SCOPES = ["INDIVIDUAL", "TEAM", "SERVICE_LOCATION", "ORGANISATION"] as const;

type Issue = { finding: string | null; reasoning: string | null; actionRequired: boolean | null; evidenceCount: number };
type Action = { id: string; closedAt: Date | null; effectivenessOutcome?: string | null };
type Investigation = {
  status: string;
  immediateSafetyConcern: string | null;
  immediateSafetyResponse: string | null;
  safeguardingDecision: string | null;
  incidentDecision: string | null;
  triageSummary: string | null;
  investigationOutcome: string | null;
  remedy: string | null;
  learning: string | null;
  recurrenceReview: string | null;
  noFurtherActionRationale: string | null;
  responsePreparedAt: Date | null;
  investigatorId?: string | null;
  responseApprovedById?: string | null;
  responseApprovedAt: Date | null;
  findingsCommunicated: boolean | null;
  remedyCommunicated: boolean | null;
  escalationRightsConfirmed: boolean | null;
} | null;

export function complaintWorkflowStage(input: { closed: boolean; reopened: boolean; acknowledged: boolean; investigationComplete: boolean; responseIssued: boolean; openActions: number; assuranceReady: boolean }) {
  if (input.closed) return "CLOSED";
  if (input.reopened) return "REOPENED";
  if (!input.acknowledged) return "AWAITING_ACKNOWLEDGEMENT";
  if (!input.investigationComplete) return "UNDER_INVESTIGATION";
  if (!input.responseIssued) return "AWAITING_RESPONSE";
  if (input.openActions) return "ACTIONS_OUTSTANDING";
  return input.assuranceReady ? "AWAITING_ASSURANCE" : "ASSURANCE_GAPS";
}

export function complaintAssuranceReadiness(input: {
  riskLevel: string;
  investigation: Investigation;
  issues: Issue[];
  actions: Action[];
  acknowledged: boolean;
  responseIssued: boolean;
  finalResponseEvidence: boolean;
  closureEvidenceCount: number;
}) {
  const material = ["MEDIUM", "HIGH", "CRITICAL"].includes(input.riskLevel);
  const serious = ["HIGH", "CRITICAL"].includes(input.riskLevel);
  const has = (value: string | null | undefined) => Boolean(value?.trim());
  const openActions = input.actions.filter((action) => !action.closedAt);
  const ineffective = input.actions.filter((action) => action.closedAt && action.effectivenessOutcome !== "EFFECTIVE");
  const actionIssues = input.issues.filter((issue) => issue.actionRequired === true);
  const checks = [
    { key: "risk-assessed", label: "Professional risk level assessed", met: input.riskLevel !== "UNASSESSED", reason: "Record an accountable risk judgement before management assurance or closure. Unassessed does not mean Low." },
    { key: "safety", label: "Immediate safety position addressed", met: has(input.investigation?.immediateSafetyConcern) && (!String(input.investigation?.immediateSafetyConcern).includes("requiring action") || has(input.investigation?.immediateSafetyResponse)), reason: "Record the immediate safety position and any interim control without inventing an outcome." },
    { key: "triage", label: "Complaint understood and triaged", met: has(input.investigation?.triageSummary), reason: "Summarise the complaint scope, seriousness and proportionate investigation approach." },
    { key: "acknowledgement", label: "Acknowledgement recorded", met: input.acknowledged, reason: "Add the acknowledgement as a governed communication event." },
    { key: "investigation", label: "Proportionate investigation completed", met: input.investigation?.status === "COMPLETED", reason: "Complete the investigation before seeking management assurance." },
    { key: "issues", label: "Every complaint issue has a finding and rationale", met: input.issues.length > 0 && input.issues.every((issue) => Boolean(issue.finding) && has(issue.reasoning)), reason: "Record a human finding and evidence-based rationale for every issue." },
    { key: "finding-evidence", label: "Material findings have governed Evidence", met: !material || input.issues.every((issue) => issue.finding === "WITHDRAWN" || issue.evidenceCount > 0), reason: "Link Evidence considered for each material finding; a document’s presence does not prove the finding." },
    { key: "response", label: "Final response issued", met: input.responseIssued, reason: "Record the issued final response in the append-only communication chronology." },
    { key: "response-evidence", label: "Material final response Evidence retained", met: !material || input.finalResponseEvidence, reason: "Link the governed final-response document for a material Complaint." },
    { key: "response-approval", label: "Serious response approved by an accountable manager", met: !serious || (Boolean(input.investigation?.responseApprovedAt) && (input.riskLevel !== "CRITICAL" || input.investigation?.responseApprovedById !== input.investigation?.investigatorId)), reason: input.riskLevel === "CRITICAL" ? "A Critical Complaint response requires attributable approval by an authorised person other than its investigator." : "High and Critical Complaint responses require attributable approval before closure." },
    { key: "communication", label: "Findings, remedy and escalation information addressed", met: input.investigation?.findingsCommunicated === true && input.investigation?.remedyCommunicated !== null && input.investigation?.escalationRightsConfirmed !== null, reason: "Record whether findings, remedy and escalation or next-step information were communicated or not applicable." },
    { key: "action-path", label: "Required improvement uses central Actions", met: actionIssues.length === 0 || input.actions.length > 0, reason: "Create a central Action where an issue requires improvement; do not leave required work only in prose." },
    { key: "actions", label: "No unresolved Complaint Actions", met: openActions.length === 0, reason: `${openActions.length} linked central Action(s) remain unresolved. Action and Complaint closure are separate decisions.` },
    { key: "effectiveness", label: "Serious Complaint Actions have demonstrated effectiveness", met: !serious || ineffective.length === 0, reason: `${ineffective.length} closed Action(s) do not have an Effective outcome. Completion does not prove the change worked.` },
    { key: "outcome", label: "Outcome and remedy considered", met: has(input.investigation?.investigationOutcome) && has(input.investigation?.remedy), reason: "Record the investigation outcome and remedy, including a proportionate not-applicable rationale." },
    { key: "learning", label: "Learning considered", met: has(input.investigation?.learning), reason: "Record learning or explain why no learning was identified." },
    { key: "recurrence", label: "Serious recurrence position considered", met: !serious || has(input.investigation?.recurrenceReview), reason: "Use controlled category/location signals and management judgement; do not claim recurrence from fuzzy text matching." },
    { key: "closure-evidence", label: "Sufficient appropriate closure Evidence selected", met: !material || input.closureEvidenceCount > 0, reason: "Select governed Evidence supporting the closure decision. Low Complaints may close with an accountable rationale where separate Evidence is disproportionate." },
  ];
  return managementAssuranceTest(checks);
}

export function complaintClosureAuthority(input: { riskLevel: string; actorRoleKey: string; actorId: string; createdById: string; investigatorId?: string | null }) {
  const lowRoles = [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.QUALITY_MANAGER];
  const materialRoles = [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.QUALITY_MANAGER, ROLE_KEYS.NOMINATED_INDIVIDUAL];
  const seriousRoles = [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.NOMINATED_INDIVIDUAL];
  const authorisedRoles = input.riskLevel === "LOW" ? lowRoles : ["HIGH", "CRITICAL"].includes(input.riskLevel) ? seriousRoles : materialRoles;
  const roleAuthorised = authorisedRoles.includes(input.actorRoleKey as never);
  const separateDecisionRequired = input.riskLevel === "CRITICAL";
  const independent = !separateDecisionRequired || (input.actorId !== input.createdById && input.actorId !== input.investigatorId);
  return {
    authorisedRoles,
    roleAuthorised,
    separateDecisionRequired,
    independent,
    allowed: roleAuthorised && independent,
    reason: !roleAuthorised ? "Your provider role is not authorised to close this level of Complaint." : !independent ? "A Critical Complaint requires an authorised closer who did not create or investigate it." : "Authorised for this Complaint level.",
  };
}

export function complaintDeadlineState(input: { dueAt: Date | null; completedAt: Date | null; now?: Date }) {
  if (!input.dueAt) return "NOT_SET";
  if (input.completedAt) return input.completedAt <= input.dueAt ? "ON_TIME" : "LATE";
  return input.dueAt < (input.now ?? new Date()) ? "OVERDUE" : "UPCOMING";
}
