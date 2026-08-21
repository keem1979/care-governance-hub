export type AssuranceCheck = {
  key: string;
  label: string;
  met: boolean;
  reason: string;
  provenance?: string;
};

export type ManagementAssuranceResult = {
  state: "READY_FOR_ASSURANCE" | "OUTSTANDING_REQUIREMENTS";
  checks: AssuranceCheck[];
  outstanding: AssuranceCheck[];
  conflicts: string[];
};

export function managementAssuranceTest(checks: AssuranceCheck[], conflicts: string[] = []): ManagementAssuranceResult {
  const outstanding = checks.filter((check) => !check.met);
  return {
    state: outstanding.length || conflicts.length ? "OUTSTANDING_REQUIREMENTS" : "READY_FOR_ASSURANCE",
    checks,
    outstanding,
    conflicts,
  };
}

export function riskManagementAssurance(input: {
  risk: {
    cause: string | null;
    riskEvent: string | null;
    consequence: string | null;
    existingControls: string;
    controlEffectiveness: string | null;
    controlAssurance: string | null;
    ownerId: string | null;
    nextReviewDate: Date;
    residualScore: number;
    toleranceScore: number | null;
    status: string;
  };
  independentEvidence: { title: string; assuranceState: string }[];
  actions: { reference: string; status: string; dueDate: Date; evidenceCount: number; evidenceRequired: boolean; effectivenessCount?: number }[];
  now?: Date;
}): ManagementAssuranceResult {
  const now = input.now ?? new Date();
  const outsideTolerance = Number.isInteger(input.risk.toleranceScore) && input.risk.residualScore > Number(input.risk.toleranceScore);
  const unresolvedActions = input.actions.filter((action) => !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(action.status));
  const overdueActions = unresolvedActions.filter((action) => action.dueDate < now);
  const completedAwaitingEffectiveness = input.actions.filter((action) => action.status === "COMPLETED" && !action.effectivenessCount);
  const reliableEvidence = input.independentEvidence.filter((item) => ["CURRENT_VERIFIED", "VERIFIED_WITH_LIMITATIONS", "EXPIRING_SOON"].includes(item.assuranceState));
  const closurePosition = ["CLOSED", "ARCHIVED"].includes(input.risk.status);
  const checks: AssuranceCheck[] = [
    { key: "defined", label: "Risk clearly defined", met: Boolean(input.risk.cause?.trim() && input.risk.riskEvent?.trim() && input.risk.consequence?.trim()), reason: "Record cause, uncertain event and consequence.", provenance: "Risk statement" },
    { key: "owner", label: "Accountable owner assigned", met: Boolean(input.risk.ownerId), reason: "Assign an accountable risk owner.", provenance: "Risk ownership" },
    { key: "controls", label: "Current controls identified", met: Boolean(input.risk.existingControls.trim()), reason: "Record controls operating now, not planned work.", provenance: "Control assessment" },
    { key: "evidence", label: "Suitable supporting evidence linked", met: reliableEvidence.length > 0, reason: input.independentEvidence.length ? "Linked evidence is unverified, stale, rejected or expired." : "Link supporting evidence from the Evidence Library; the live Risk record alone is not closure evidence.", provenance: "Evidence Library verification" },
    { key: "effectiveness", label: "Control effectiveness tested", met: input.risk.controlEffectiveness !== "NOT_TESTED" && Boolean(input.risk.controlAssurance?.trim()), reason: "Record how the controls were tested and the result.", provenance: "Control effectiveness assessment" },
    { key: "treatment", label: "Outside-tolerance exposure has an action", met: !outsideTolerance || unresolvedActions.length > 0, reason: "Create a linked Follow-Up Action or record authorised acceptance.", provenance: "Risk threshold and Action Tracker" },
    { key: "overdue", label: "No overdue linked treatment action", met: overdueActions.length === 0, reason: `${overdueActions.length} linked treatment action${overdueActions.length === 1 ? " is" : "s are"} overdue.`, provenance: "Action Tracker due dates" },
    { key: "action-effectiveness", label: "Completed treatment effectiveness assessed", met: completedAwaitingEffectiveness.length === 0, reason: `${completedAwaitingEffectiveness.length} completed treatment action${completedAwaitingEffectiveness.length === 1 ? " is" : "s are"} awaiting an effectiveness review. Completion does not prove the Risk reduced.`, provenance: "Action effectiveness reviews" },
    { key: "review", label: "Risk review is current", met: closurePosition || input.risk.nextReviewDate >= now, reason: "Complete the overdue formal risk review.", provenance: "Risk review schedule" },
    { key: "closure", label: "Closure does not leave unresolved actions", met: !closurePosition || unresolvedActions.length === 0, reason: "Resolve, transfer or formally account for linked actions before closure.", provenance: "Risk status and Action Tracker" },
  ];
  const conflicts: string[] = [];
  if (input.risk.controlEffectiveness === "EFFECTIVE" && reliableEvidence.length === 0) conflicts.push("Controls are rated Effective, but no current verified independent evidence is linked.");
  if (input.risk.controlEffectiveness === "EFFECTIVE" && overdueActions.length) conflicts.push("Controls are rated Effective while linked treatment actions remain overdue.");
  if (input.risk.controlEffectiveness === "EFFECTIVE" && completedAwaitingEffectiveness.length) conflicts.push("Controls are rated Effective while completed treatment Actions are still awaiting an effectiveness review.");
  if (closurePosition && unresolvedActions.length) conflicts.push("The risk is closed or archived while linked treatment actions remain unresolved.");
  return managementAssuranceTest(checks, conflicts);
}
