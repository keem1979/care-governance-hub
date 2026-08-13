export const ASSURANCE_LIFECYCLE_STATUSES = ["NEW_FINDING","UNDER_REVIEW","DUPLICATE_CANDIDATE","LINKED_TO_EXISTING_ACTION","ACTION_REQUIRED","ACTION_IN_PROGRESS","AWAITING_EVIDENCE","MANAGEMENT_RESPONSE_RECORDED","AWAITING_VERIFICATION","CLOSED_VERIFIED","MONITORING_RECURRENCE","REOPENED_REPEAT_FINDING","NO_ACTION_REQUIRED"] as const;
export const MEDICATION_ISSUE_TYPES = ["OUT_OF_STOCK","DISCONTINUED_BY_PRESCRIBER","NOT_DUE","PRN_NOT_REQUIRED","SERVICE_USER_REFUSAL","OMITTED_DOSE","RECORDING_ERROR","MAR_ENTRY_UNAVAILABLE","SUPPLY_REQUEST_SUBMITTED","SUPPLY_RECEIVED","CLARIFICATION_PENDING","RESOLVED_VERIFIED"] as const;

export type MatchInput = { id: string; locationId: string | null; clientId: string | null; staffMemberId: string | null; category: string; issueKey: string | null; medicationIssueType: string | null; sourceType: string; sourceRecordId: string | null; title: string; description: string; status: string; lifecycleStatus: string; lastSeenAt: Date; managementResponse?: string | null };
export type FindingInput = Omit<MatchInput, "id" | "status" | "lifecycleStatus" | "lastSeenAt"> & { occurredAt: Date };
export type MatchSuggestion = { actionId: string; score: number; kind: "EXACT_SOURCE" | "LIKELY_DUPLICATE" | "POSSIBLE_MATCH" | "RECURRENCE"; rationale: string[] };

export function normaliseIssueKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word)).slice(0, 12).sort().join("-");
}

export function suggestActionMatches(finding: FindingInput, candidates: MatchInput[]): MatchSuggestion[] {
  return candidates.flatMap((candidate): MatchSuggestion[] => {
    if (finding.locationId && candidate.locationId && finding.locationId !== candidate.locationId) return [];
    if (finding.clientId && candidate.clientId && finding.clientId !== candidate.clientId) return [];
    if (finding.clientId && !candidate.clientId || !finding.clientId && candidate.clientId) return [];
    if (finding.sourceRecordId && finding.sourceType === candidate.sourceType && finding.sourceRecordId === candidate.sourceRecordId) return [{ actionId: candidate.id, score: 100, kind: "EXACT_SOURCE" as const, rationale: ["Same originating record"] }];
    let score = 0; const rationale: string[] = [];
    if (finding.locationId && finding.locationId === candidate.locationId) { score += 15; rationale.push("Same branch or service"); }
    if (finding.clientId && finding.clientId === candidate.clientId) { score += 35; rationale.push("Same service user"); }
    if (finding.staffMemberId && finding.staffMemberId === candidate.staffMemberId) { score += 10; rationale.push("Same staff member"); }
    if (finding.category.toLowerCase() === candidate.category.toLowerCase()) { score += 15; rationale.push("Same category"); }
    if (finding.issueKey && finding.issueKey === candidate.issueKey) { score += 25; rationale.push("Same issue or medication key"); }
    if (finding.medicationIssueType && finding.medicationIssueType === candidate.medicationIssueType) { score += 10; rationale.push("Same medication exception type"); }
    const similarity = wordingSimilarity(`${finding.title} ${finding.description}`, `${candidate.title} ${candidate.description}`);
    if (similarity >= .55) { score += 15; rationale.push(`Similar wording (${Math.round(similarity * 100)}%)`); }
    const days = Math.abs(finding.occurredAt.getTime() - candidate.lastSeenAt.getTime()) / 86_400_000;
    if (days <= 7) { score += 10; rationale.push("Within seven days"); }
    if (medicationResolutionBlocksRepeat(finding.medicationIssueType, candidate.medicationIssueType, candidate.lifecycleStatus)) { score = Math.max(score, 85); rationale.push("Existing medication resolution controls this repeat"); }
    if (score < 45) return [];
    const closed = ["CLOSED_VERIFIED", "MONITORING_RECURRENCE"].includes(candidate.lifecycleStatus) || candidate.status === "COMPLETED";
    return [{ actionId: candidate.id, score: Math.min(99, score), kind: closed ? "RECURRENCE" as const : score >= 70 ? "LIKELY_DUPLICATE" as const : "POSSIBLE_MATCH" as const, rationale }];
  }).sort((a, b) => b.score - a.score).slice(0, 5);
}

export function validateVerifiedClosure(input: { status: string; evidenceCount: number; managementResponse?: string | null; completedActionSummary?: string | null; evidenceReviewedSummary?: string | null; immediateRiskControlled?: boolean | null; underlyingRecordCorrected?: boolean | null; staffSupportCompleted?: boolean | null; widerRecordsChecked?: boolean | null; recurrenceChecked?: boolean | null; verificationRationale?: string | null; closureNote?: string | null; verifiedById?: string | null; ownerId: string; priority: string; verificationDate?: Date | null }) {
  if (input.status !== "COMPLETED") return;
  if (input.evidenceCount === 0) throw new Error("Closed and verified requires supporting evidence; a management response alone is not closure.");
  for (const [value, message] of [[input.completedActionSummary, "Record what action was completed."], [input.evidenceReviewedSummary, "Record the evidence reviewed."], [input.verificationRationale, "Record the verification and closure rationale."], [input.closureNote, "Enter the closure outcome."]] as const) if (!value?.trim()) throw new Error(message);
  if (!input.verifiedById || !input.verificationDate) throw new Error("Closed and verified requires a named verifier and verification date.");
  if (["HIGH", "CRITICAL"].includes(input.priority) && input.verifiedById === input.ownerId) throw new Error("High and critical actions require a verifier who is independent of the action owner.");
  if ([input.immediateRiskControlled, input.underlyingRecordCorrected, input.staffSupportCompleted, input.widerRecordsChecked, input.recurrenceChecked].some((value) => value === null || value === undefined)) throw new Error("Complete every verification check, recording yes or no as appropriate.");
}

export function lifecycleForAction(input: { actionStatus: string; managementResponse?: string | null; evidenceCount: number; verified: boolean; monitoringUntil?: Date | null }, now = new Date()): string {
  if (input.actionStatus === "COMPLETED" && input.verified) return input.monitoringUntil && input.monitoringUntil > now ? "MONITORING_RECURRENCE" : "CLOSED_VERIFIED";
  if (input.actionStatus === "AWAITING_VERIFICATION") return "AWAITING_VERIFICATION";
  if (input.managementResponse && input.evidenceCount === 0) return "MANAGEMENT_RESPONSE_RECORDED";
  if (input.actionStatus === "AWAITING_EVIDENCE" || input.managementResponse) return "AWAITING_EVIDENCE";
  if (["IN_PROGRESS", "BLOCKED", "OVERDUE"].includes(input.actionStatus)) return "ACTION_IN_PROGRESS";
  return "ACTION_REQUIRED";
}

export function medicationResolutionBlocksRepeat(incoming: string | null, existing: string | null, lifecycle: string): boolean {
  return incoming === "OUT_OF_STOCK" && existing === "DISCONTINUED_BY_PRESCRIBER" && ["CLOSED_VERIFIED", "MONITORING_RECURRENCE"].includes(lifecycle);
}

export function refusalRequiresNewAction(input: { capacityConfirmed: boolean; carePlanFollowed: boolean; offered: boolean; escalationCompleted: boolean; thresholdMet: boolean }): boolean {
  return input.thresholdMet || !input.capacityConfirmed || !input.carePlanFollowed || !input.offered || !input.escalationCompleted;
}

export function monitoringOutcome(input: { monitoringUntil: Date | null; lastSeenAt: Date; recurrenceCount: number }, now = new Date()): "MONITORING" | "SUSTAINED_IMPROVEMENT" | "RECURRENCE" {
  if (input.recurrenceCount > 0) return "RECURRENCE";
  if (input.monitoringUntil && input.monitoringUntil <= now && input.lastSeenAt < input.monitoringUntil) return "SUSTAINED_IMPROVEMENT";
  return "MONITORING";
}

function wordingSimilarity(a: string, b: string): number { const left = new Set(normaliseIssueKey(a).split("-").filter(Boolean)), right = new Set(normaliseIssueKey(b).split("-").filter(Boolean)); if (!left.size || !right.size) return 0; const shared = [...left].filter((word) => right.has(word)).length; return shared / new Set([...left, ...right]).size; }
const STOP_WORDS = new Set(["the","and","for","with","from","this","that","was","were","has","have","not","action","issue","finding","service","user"]);
