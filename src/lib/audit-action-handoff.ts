import { ACTION_CATEGORIES } from "@/lib/actions";

export type AuditFindingForAction = {
  id: string;
  severity: string;
  summary: string;
  recommendation: string | null;
  immediateControl: string | null;
  criterionKeySnapshot: string;
  audit: { title: string; locationId: string; reviewDate: Date | null; auditorId: string };
};

export function auditFindingActionPrefill(finding: AuditFindingForAction, fallbackOwnerId: string, oversightOwnerIds: Set<string>) {
  const ownerId = fallbackOwnerId;
  const oversightOwnerId = oversightOwnerIds.has(fallbackOwnerId) ? fallbackOwnerId : "";
  const required = finding.recommendation?.trim() || `Correct the gap identified against ${finding.summary}.`;
  return {
    title: required.length <= 180 ? required : `Address audit finding: ${finding.summary}`.slice(0, 180),
    description: required,
    category: ACTION_CATEGORIES.includes("Quality improvement" as never) ? "Quality improvement" : ACTION_CATEGORIES[0],
    rootCause: "Confirm the underlying and contributing causes before closure.",
    expectedOutcome: `The finding against “${finding.summary}” is corrected, the immediate risk is controlled and the required standard is consistently met.`,
    successMeasure: `Completion evidence is verified and a targeted re-audit of criterion ${finding.criterionKeySnapshot} demonstrates whether the improvement worked.`,
    locationId: finding.audit.locationId,
    ownerId,
    oversightOwnerId,
    priority: finding.severity === "MEDIUM" ? "MEDIUM" : finding.severity,
    dueDate: inputDate(finding.audit.reviewDate) || future(finding.severity === "CRITICAL" ? 2 : finding.severity === "HIGH" ? 7 : 30),
    reviewDate: future(finding.severity === "CRITICAL" ? 1 : 7),
    escalationRequired: finding.severity === "CRITICAL",
    escalationReason: finding.severity === "CRITICAL" ? "Critical Audit Finding requires immediate management review and documented safety control." : "",
    issueKey: finding.criterionKeySnapshot,
  };
}

function inputDate(value: Date | null) { return value?.toISOString().slice(0, 10) ?? ""; }
function future(days: number) { const value = new Date(); value.setUTCDate(value.getUTCDate() + days); return inputDate(value); }
