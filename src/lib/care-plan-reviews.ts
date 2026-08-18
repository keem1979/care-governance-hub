import { makeActionReference } from "@/lib/actions";

export const CARE_PLAN_REVIEW_KEY = "care-plan-reviews";
export const CARE_PLAN_REVIEW_VERSION = 2;

export const REVIEW_TYPES = [
  "Scheduled review", "Early review", "Significant change", "Post incident",
  "Post fall / injury", "Post hospital admission / discharge", "Medication change",
  "Safeguarding", "Mental-health review", "MDT review", "Transfer of care",
  "Complaint / feedback", "Change in commissioned package", "Audit finding",
  "End-of-life review", "Other",
] as const;

export const WORKFLOW_STATUSES = [
  "Draft", "In Review", "Awaiting Person / Representative",
  "Awaiting External Information", "Awaiting Actions", "Awaiting RM Assurance",
  "Approved With Actions", "Approved / Closed", "Returned For Action",
  "Urgent Review Required", "Archived",
] as const;

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const EVIDENCE_SOURCES = [
  "Current care plan", "Previous care-plan review", "Initial / latest needs assessment",
  "Risk assessments", "MAR / eMAR", "Medication support plan",
  "Current prescription / pharmacy information", "Recent care notes", "Handover notes",
  "Body maps / skin records", "Falls records", "Incident reports", "Safeguarding records",
  "Hospital discharge information", "GP correspondence", "District nurse information",
  "Mental-health team information", "Specialist clinical information",
  "Moving and handling assessment", "Nutrition / hydration assessment", "Capacity assessment",
  "Best-interest decision", "Complaints / feedback", "Audit findings",
  "Commissioner correspondence", "Family / representative information", "Other",
] as const;

export const REVIEW_DOMAINS = [
  "General physical health", "Mental health", "Medication", "Mobility", "Falls",
  "Moving and handling", "Skin integrity", "Wounds", "Pressure care", "Continence",
  "Personal care", "Nutrition", "Hydration", "Dysphagia / swallowing", "Diabetes",
  "Epilepsy / seizures", "Respiratory care", "PEG / enteral feeding", "Pain", "Cognition",
  "Communication", "Capacity / decision making", "Distress / behaviour",
  "Self-harm / suicide risk", "Self-neglect", "Safeguarding", "Exploitation",
  "Substance use", "Sleep", "Sensory needs", "Infection prevention",
  "Home / environmental safety", "Fire safety", "Hoarding / decluttering",
  "Community access", "Social / emotional wellbeing", "Relationships",
  "Finances where provider support applies", "Equipment", "End of life / palliative care", "Other",
] as const;

export const RM_ASSURANCE_TESTS = [
  "Person meaningfully involved", "Representative involvement appropriate",
  "Capacity / consent lawful and evidenced", "Current needs accurately reflected",
  "Risks reviewed", "Controls proportionate", "Clinical escalation plan clear",
  "Medication reconciled", "Safeguarding concerns addressed",
  "Restrictions lawful and least restrictive", "Care package sufficient",
  "Commissioner actions identified", "Required care-plan changes completed",
  "Linked risk assessments updated", "Staff informed", "Competency / supervision identified",
  "External referrals tracked", "No unresolved conflicting records",
  "Critical actions adequately controlled", "High-risk actions adequately controlled",
  "Evidence supports decisions", "Next review frequency proportionate",
] as const;

export const LINKED_RECORD_CHECKS = [
  "Main care plan updated", "Risk assessments updated", "MAR/eMAR updated",
  "Medication support plan updated", "Moving and handling plan updated",
  "Nutrition / hydration plan updated", "Mental-health plan updated",
  "Behaviour / distress plan updated", "Skin / wound plan updated",
  "Emergency / escalation plan updated", "Quick profile updated",
  "Visit task instructions updated", "Rota requirements updated", "Commissioner informed",
  "Health professionals informed", "Family / representative informed",
  "Staff read-and-understood required",
] as const;

export type CarePlanReviewPayload = Record<string, unknown> & {
  schemaVersion?: number;
  workflowStatus?: string;
  reviewType?: string;
  reviewDueDate?: string;
  reviewCompletedAt?: string;
  carePlanReference?: string;
  carePlanVersion?: string;
  reasonForReview?: string;
  mainDecisionRequired?: string;
  currentRisk?: string;
  personInvolved?: string;
  involvementReason?: string;
  involvementSupport?: string;
  immediateRisk?: string;
  immediateRiskOutcome?: string;
  rmInterimControlDecision?: string;
  evidenceConflict?: string;
  authoritativeSourceConfirmed?: string;
  medicationApplies?: string;
  medicationChanged?: string;
  medicationDiscrepancy?: string;
  safeguardingConcern?: string;
  packageOverall?: string;
  changesRequired?: string;
  currentPlanSuitableReason?: string;
  agreedChanges?: string;
  rmDecision?: string;
  rmRationale?: string;
  interimSafetyControls?: string;
  nextReviewDate?: string;
  rmName?: string;
  rmSignOffAt?: string;
  domains?: unknown[];
  reviewActions?: unknown[];
};

export type ReviewActionInput = {
  id?: string;
  actionId?: string;
  automationKey?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  finding: string;
  ownerId: string;
  dueDate: string;
  evidenceRequired: string;
  expectedOutcome: string;
  successMeasure: string;
};

export function addRequiredAutomatedActions(
  payload: CarePlanReviewPayload,
  ownerId: string | null,
  now = new Date(),
): CarePlanReviewPayload {
  if (!ownerId) return payload;
  const actions = parseReviewActions(payload.reviewActions);
  const add = (automationKey: string, priority: ReviewActionInput["priority"], finding: string, evidenceRequired: string, expectedOutcome: string, successMeasure: string) => {
    if (actions.some((action) => action.automationKey === automationKey)) return;
    actions.push({ automationKey, priority, finding, ownerId, dueDate: defaultDueDate(priority, now), evidenceRequired, expectedOutcome, successMeasure });
  };

  if (payload.evidenceConflict === "Yes" && payload.authoritativeSourceConfirmed !== "Yes") {
    add("resolve-evidence-conflict", "HIGH", "Resolve conflicting care-plan evidence and confirm the authoritative record", "Reconciled records and documented source decision", "Staff use one accurate, authorised care record.", "No unresolved discrepancy remains across the reviewed records.");
  }
  if (payload.medicationApplies === "Yes" && payload.medicationDiscrepancy === "Yes") {
    add("medication-discrepancy", payload.currentRisk === "CRITICAL" ? "CRITICAL" : "HIGH", "Resolve the medication discrepancy and reconcile the care plan, MAR/eMAR and prescription", "Reconciled MAR/eMAR, prescription and updated medication support plan", "Medication information is current, consistent and safe at the point of care.", "A competent reviewer verifies that all medication records agree.");
  }
  if (["Review required", "Insufficient / unsafe"].includes(String(payload.packageOverall))) {
    add("care-package-sufficiency", payload.packageOverall === "Insufficient / unsafe" ? "CRITICAL" : "HIGH", "Escalate the care-package sufficiency concern to management and the commissioner", "Escalation record, commissioner response and revised package decision", "The commissioned package safely meets the person's assessed needs.", "Visits, staffing and commissioned hours match the updated care plan.");
  }
  if (payload.immediateRisk === "Yes") {
    add("immediate-risk-follow-up", payload.currentRisk === "CRITICAL" ? "CRITICAL" : "HIGH", "Verify that immediate risk controls remain effective and are reflected in the care plan", "Manager verification and updated risk-control records", "Immediate controls remain effective until the longer-term plan is implemented.", "No gap exists between the identified risk, interim control and staff instructions.");
  }
  return { ...payload, reviewActions: actions };
}

export function parseCarePlanReviewPayload(value: unknown): CarePlanReviewPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as CarePlanReviewPayload;
}

export function parseReviewActions(value: unknown): ReviewActionInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ReviewActionInput => {
    if (!item || typeof item !== "object") return false;
    const action = item as Partial<ReviewActionInput>;
    return Boolean(action.finding && action.ownerId && action.dueDate);
  });
}

export function validateCarePlanReview(input: {
  payload: CarePlanReviewPayload;
  clientId: string | null;
  locationId: string | null;
  ownerId: string | null;
}) {
  const { payload } = input;
  validateReviewActionInputs(payload.reviewActions);
  if (!input.clientId) throw new Error("Choose the person whose care plan is being reviewed.");
  if (!input.locationId) throw new Error("Choose the responsible service location.");
  if (!input.ownerId) throw new Error("Choose the lead reviewer.");
  required(payload.carePlanReference, "Enter the current care-plan reference.");
  required(payload.reviewType, "Choose the review type.");
  required(payload.reviewDueDate, "Enter the review due date.");
  required(payload.reasonForReview, "Explain what triggered this review.");
  required(payload.mainDecisionRequired, "Record the main decision this review must resolve.");
  if (!RISK_LEVELS.includes(String(payload.currentRisk ?? "") as never)) {
    throw new Error("Choose the current review risk.");
  }
  if (["Partially", "No"].includes(String(payload.personInvolved))) {
    required(payload.involvementReason, "Explain why the person was only partly involved or not involved.");
    required(payload.involvementSupport, "Record what was done to enable the person's involvement.");
  }
  if (payload.immediateRisk === "Yes") {
    required(payload.immediateConcern, "Describe the immediate concern.");
    required(payload.immediateActionTaken, "Record the immediate action taken.");
  }
  if (payload.currentRisk === "CRITICAL" && isClosingStatus(payload.workflowStatus)) {
    if (!text(payload.immediateRiskOutcome) && !text(payload.rmInterimControlDecision)) {
      throw new Error("A Critical review cannot close without an outcome or an explicit Registered Manager interim-control decision.");
    }
  }
  if (payload.evidenceConflict === "Yes" && payload.authoritativeSourceConfirmed !== "Yes") {
    const actions = parseReviewActions(payload.reviewActions);
    if (!actions.length) throw new Error("Create an action for unresolved conflicting evidence.");
  }
  if (["Yes", "Unknown"].includes(String(payload.medicationChanged)) && payload.medicationApplies === "Yes") {
    const checks = array(payload.medicationChecks);
    if (!checks.includes("Current MAR/eMAR verified") || !checks.includes("Current prescription verified")) {
      throw new Error("Medication change requires MAR/eMAR and current prescription verification.");
    }
  }
  if (payload.changesRequired === "Yes" && !text(payload.agreedChanges) && !parseReviewActions(payload.reviewActions).length) {
    throw new Error("Record the agreed care-plan change or create an accountable action.");
  }
  if (payload.changesRequired === "No") {
    required(payload.currentPlanSuitableReason, "Explain why the current plan remains suitable.");
  }
  if (["Review required", "Insufficient / unsafe"].includes(String(payload.packageOverall))) {
    if (!parseReviewActions(payload.reviewActions).length) {
      throw new Error("Create a management or commissioner action for an insufficient care package.");
    }
  }
  if (payload.rmDecision === "APPROVED WITH ACTIONS") {
    required(payload.rmRationale, "Registered Manager rationale is required for Approved With Actions.");
    required(payload.interimSafetyControls, "Record the interim safety controls.");
  }
  if (["APPROVED", "APPROVED WITH ACTIONS"].includes(String(payload.rmDecision))) {
    required(payload.rmRationale, "Record the Registered Manager's rationale.");
    required(payload.nextReviewDate, "Set the next review date.");
    required(payload.rmName, "Record the Registered Manager name.");
    required(payload.rmSignOffAt, "Record the electronic sign-off date and time.");
  }
  if (payload.rmDecision === "APPROVED" && hasOpenCriticalAction(payload.reviewActions)) {
    throw new Error("Critical assurance issues remain open. Resolve or explicitly control them before approval.");
  }
}

function validateReviewActionInputs(value: unknown) {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    if (!item || typeof item !== "object") throw new Error("Remove the incomplete action or complete all action fields.");
    const action = item as Partial<ReviewActionInput>;
    if (!text(action.finding) || !text(action.ownerId) || !text(action.dueDate) || !text(action.evidenceRequired)) {
      throw new Error("Every action requires a finding, accountable owner, due date and evidence requirement.");
    }
  }
}

export function registerStatusForWorkflow(status: unknown) {
  if (status === "Archived") return "ARCHIVED";
  if (status === "Approved / Closed") return "CLOSED";
  if (["Awaiting Actions", "Approved With Actions", "Returned For Action"].includes(String(status))) return "AWAITING_ACTION";
  if (status === "Draft") return "OPEN";
  return "IN_REVIEW";
}

export function isClosingStatus(status: unknown) {
  return ["Approved / Closed", "Approved With Actions"].includes(String(status));
}

export function reviewRisk(payload: CarePlanReviewPayload) {
  return RISK_LEVELS.includes(String(payload.currentRisk) as never)
    ? String(payload.currentRisk)
    : "LOW";
}

export function defaultDueDate(priority: string, now = new Date()) {
  const due = new Date(now);
  due.setUTCDate(due.getUTCDate() + (priority === "CRITICAL" ? 0 : priority === "HIGH" ? 1 : priority === "MEDIUM" ? 7 : 14));
  return due.toISOString().slice(0, 10);
}

export function centralActionData(action: ReviewActionInput, review: {
  organisationId: string; locationId: string | null; clientId: string | null;
  entryId: string; reviewReference: string; actorId: string;
}) {
  const dueDate = new Date(`${action.dueDate}T12:00:00.000Z`);
  return {
    organisationId: review.organisationId,
    locationId: review.locationId,
    clientId: review.clientId,
    reference: makeActionReference(),
    title: action.finding.slice(0, 160),
    description: action.finding,
    category: "Care quality",
    expectedOutcome: action.expectedOutcome || "The revised care plan is safe, current and implemented.",
    successMeasure: action.successMeasure || action.evidenceRequired,
    sourceType: "REGISTER" as const,
    sourceRecordId: review.entryId,
    sourceReference: review.reviewReference,
    sourceUrl: `/registers/care-plan-reviews/${review.entryId}`,
    issueKey: `care-plan-review:${review.entryId}:${normalise(action.finding)}`.slice(0, 240),
    ownerId: action.ownerId,
    priority: action.priority,
    dueDate,
    status: "OPEN" as const,
    lifecycleStatus: "ACTION_REQUIRED" as const,
    evidenceRequired: true,
    createdById: review.actorId,
  };
}

export function carePlanReviewData(entryData: unknown): CarePlanReviewPayload {
  const data = parseCarePlanReviewPayload(entryData);
  const nested = parseCarePlanReviewPayload(data.carePlanReview);
  return Object.keys(nested).length ? nested : data;
}

function required(value: unknown, message: string) {
  if (!text(value)) throw new Error(message);
}
function text(value: unknown) { return String(value ?? "").trim(); }
function array(value: unknown) { return Array.isArray(value) ? value.map(String) : []; }
function normalise(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function hasOpenCriticalAction(value: unknown) {
  return parseReviewActions(value).some((action) => action.priority === "CRITICAL" && !action.actionId);
}
