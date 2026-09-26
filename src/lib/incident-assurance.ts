import { ROLE_KEYS } from "@/lib/permissions";

export type IncidentAssuranceCheck = { key: string; label: string; met: boolean; reason: string };

type IncidentAction = {
  id: string;
  closedAt: Date | null;
  effectivenessOutcome?: string | null;
};

type IncidentInvestigation = {
  status: string;
  factualChronology: string | null;
  rootCause: string | null;
  notificationDecisionSummary: string | null;
  personRepresentativeInvolvement: string | null;
  learning: string | null;
  learningSharedWith: string | null;
  affectedRecordsReviewed: string | null;
  outcome: string | null;
  noFurtherActionRationale: string | null;
} | null;

export function incidentAssuranceReadiness(input: {
  riskLevel: string;
  data: Record<string, unknown>;
  investigation: IncidentInvestigation;
  actions: IncidentAction[];
  closureEvidenceCount: number;
}) {
  const material = ["MEDIUM", "HIGH", "CRITICAL"].includes(input.riskLevel);
  const high = ["HIGH", "CRITICAL"].includes(input.riskLevel);
  const openActions = input.actions.filter((action) => !action.closedAt);
  const actionsWithoutEffectiveness = input.actions.filter(
    (action) => action.closedAt && action.effectivenessOutcome !== "EFFECTIVE",
  );
  const hasDecision = (key: string) => {
    if (!Object.prototype.hasOwnProperty.call(input.data, key) || input.data[key] === "" || input.data[key] === null) return false;
    return !String(input.data[key]).toLowerCase().includes("awaiting");
  };
  const hasText = (value: string | null | undefined) => Boolean(value?.trim());
  const checks: IncidentAssuranceCheck[] = [
    { key: "risk-assessed", label: "Professional risk level assessed", met: input.riskLevel !== "UNASSESSED", reason: "Record an accountable risk judgement before management assurance or closure. Unassessed does not mean Low." },
    {
      key: "immediate-response",
      label: "Immediate safety response recorded",
      met: hasText(String(input.data.immediateResponse ?? "")),
      reason: "Record the immediate care, containment and escalation taken after the incident.",
    },
    {
      key: "harm",
      label: "Actual harm or no-harm outcome classified",
      met: hasText(String(input.data.harmLevel ?? "")) && !String(input.data.harmLevel).toLowerCase().includes("unknown"),
      reason: "Record the verified harm position, including no harm or unknown/evidence required.",
    },
    {
      key: "notifications",
      label: "Safeguarding, CQC and Duty of Candour decisions recorded",
      met: ["safeguardingReferral", "cqcNotification", "dutyOfCandour"].every(hasDecision),
      reason: "Record each statutory consideration as required, not required, or awaiting evidence; QCGMS does not make the decision.",
    },
    {
      key: "investigation",
      label: "Proportionate investigation completed",
      met: !material || (input.investigation?.status === "COMPLETED" && hasText(input.investigation.factualChronology)),
      reason: "Moderate, High and Critical incidents require a completed factual investigation.",
    },
    {
      key: "notification-rationale",
      label: "Notification decisions have an accountable rationale",
      met: !material || hasText(input.investigation?.notificationDecisionSummary),
      reason: "Record who considered safeguarding, CQC, Duty of Candour and any other notification route, with the rationale and outcome.",
    },
    {
      key: "root-cause",
      label: "Root and contributory causes identified",
      met: !high || hasText(input.investigation?.rootCause),
      reason: "High and Critical incidents require a proportionate root-cause conclusion before assurance.",
    },
    {
      key: "involvement",
      label: "Person or representative involvement recorded",
      met: !material || hasText(input.investigation?.personRepresentativeInvolvement),
      reason: "Record how the person or representative was involved, or why involvement was not appropriate.",
    },
    {
      key: "learning",
      label: "Learning and how it was shared are recorded",
      met: !material || (hasText(input.investigation?.learning) && hasText(input.investigation?.learningSharedWith)),
      reason: "Record practical learning and who received it; sending information alone does not prove improvement.",
    },
    {
      key: "affected-records",
      label: "Affected governed records reviewed",
      met: !high || hasText(input.investigation?.affectedRecordsReviewed),
      reason: "For High and Critical incidents, record which care plans, risk assessments, staff controls or policies were reviewed and the controlled outcome.",
    },
    {
      key: "treatment-path",
      label: "Required improvement is linked to canonical Actions",
      met: !high || input.actions.length > 0 || hasText(input.investigation?.noFurtherActionRationale),
      reason: "Create a central Action for required improvement, or document why no further Action is proportionate.",
    },
    {
      key: "actions",
      label: "No unresolved Incident Actions",
      met: openActions.length === 0,
      reason: `${openActions.length} linked central Action(s) remain open. Action and Incident closure are separate decisions.`,
    },
    {
      key: "effectiveness",
      label: "Closed Actions have effectiveness assurance",
      met: !high || actionsWithoutEffectiveness.length === 0,
      reason: `${actionsWithoutEffectiveness.length} closed Action(s) lack an Effective outcome. Completion does not prove the change worked.`,
    },
    {
      key: "outcome",
      label: "Investigation outcome recorded",
      met: !material || hasText(input.investigation?.outcome),
      reason: "Record the incident outcome and what remains unresolved.",
    },
    {
      key: "closure-evidence",
      label: "Sufficient appropriate closure Evidence selected",
      met: !material || input.closureEvidenceCount > 0,
      reason: "Select governed Evidence supporting the closure decision. Low incidents may close with an accountable rationale where separate Evidence is not proportionate.",
    },
  ];
  const outstanding = checks.filter((check) => !check.met);
  return { checks, outstanding, ready: outstanding.length === 0 };
}

export function incidentClosureAuthority(input: {
  riskLevel: string;
  actorRoleKey: string;
  actorId: string;
  createdById: string;
  investigatorId?: string | null;
}) {
  const lowRoles = [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.QUALITY_MANAGER];
  const materialRoles = [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.QUALITY_MANAGER, ROLE_KEYS.NOMINATED_INDIVIDUAL];
  const highRoles = [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.NOMINATED_INDIVIDUAL];
  const authorisedRoles = input.riskLevel === "LOW" ? lowRoles : ["HIGH", "CRITICAL"].includes(input.riskLevel) ? highRoles : materialRoles;
  const roleAuthorised = authorisedRoles.includes(input.actorRoleKey as never);
  const separateDecisionRequired = input.riskLevel === "CRITICAL";
  const independent = !separateDecisionRequired || (input.actorId !== input.createdById && input.actorId !== input.investigatorId);
  return {
    authorisedRoles,
    roleAuthorised,
    separateDecisionRequired,
    independent,
    allowed: roleAuthorised && independent,
    reason: !roleAuthorised
      ? "Your provider role is not authorised to close this level of incident."
      : !independent
        ? "A Critical incident requires an authorised closer who did not create or investigate the incident."
        : "Authorised for this incident level.",
  };
}
