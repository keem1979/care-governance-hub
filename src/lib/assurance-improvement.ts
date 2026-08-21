import type { Prisma } from "@/generated/prisma/client";

export type RootCauseInput = { method: string; problemStatement: string; immediateCauses: string[]; contributingFactors: string[]; systemCauses: string[]; lessons: string; preventiveControls: string };
export type VerificationInput = { outcome: string; completedWork: string; evidenceSummary: string; evidenceCount: number; successMeasureResult: string; rationale: string; verifierId: string; ownerId: string; priority: string; verifiedAt: Date | null };
export type EffectivenessInput = { outcome: string; observedResult: string; decision: string; recurrenceFound: boolean; reviewDate: Date | null; verifiedAt: Date | null; nextReviewDate: Date | null };

export function validateRootCauseReview(input: RootCauseInput) {
  if (!input.method || input.problemStatement.trim().length < 12) throw new Error("Choose a review method and record a clear problem statement.");
  if (![...input.immediateCauses, ...input.contributingFactors, ...input.systemCauses].some((item) => item.trim().length >= 3)) throw new Error("Record at least one immediate, contributing or system cause.");
  if (input.lessons.trim().length < 12) throw new Error("Record the learning from this review.");
  if (input.preventiveControls.trim().length < 12) throw new Error("Record how recurrence will be prevented or detected.");
}

export function validateIndependentVerification(input: VerificationInput) {
  if (!['VERIFIED', 'PARTIALLY_VERIFIED', 'FAILED'].includes(input.outcome)) throw new Error("Choose a valid verification outcome.");
  if (!input.verifierId || !input.verifiedAt) throw new Error("Choose a verifier and verification date.");
  if (input.evidenceCount < 1) throw new Error("Verification requires at least one linked evidence record.");
  for (const [value, message] of [[input.completedWork, "Record what work was completed."], [input.evidenceSummary, "Record the evidence checked."], [input.successMeasureResult, "Record the result against the success measure."], [input.rationale, "Record the verification rationale."]] as const) if (value.trim().length < 8) throw new Error(message);
  if (["HIGH", "CRITICAL"].includes(input.priority) && input.verifierId === input.ownerId) throw new Error("High and critical actions require verification by someone other than the action owner.");
}

export function validateEffectivenessReview(input: EffectivenessInput) {
  if (!['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'TOO_EARLY', 'INSUFFICIENT_EVIDENCE'].includes(input.outcome)) throw new Error("Choose a valid effectiveness outcome.");
  if (!input.verifiedAt) throw new Error("Complete closure verification before reviewing effectiveness.");
  // The interface records a governance date rather than a precise timestamp.
  // Permit a review on the same calendar day as verification while still
  // rejecting a genuinely earlier review date.
  if (!input.reviewDate || dateKey(input.reviewDate) < dateKey(input.verifiedAt)) throw new Error("The effectiveness review date cannot be before verification.");
  if (input.observedResult.trim().length < 8 || input.decision.trim().length < 8) throw new Error("Record the observed result and management decision.");
  if (input.outcome === "EFFECTIVE" && input.recurrenceFound) throw new Error("An action cannot be marked effective while recurrence is recorded.");
  if (input.outcome === "TOO_EARLY" && (!input.nextReviewDate || input.nextReviewDate <= input.reviewDate)) throw new Error("Set a later follow-up date when it is too early to judge effectiveness.");
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function externalDependencyState(input: { status: string; dueDate: Date; lastChasedAt: Date | null }, now = new Date()) {
  if (["RESOLVED", "CANCELLED"].includes(input.status)) return input.status;
  if (input.dueDate < now) return "OVERDUE";
  return input.lastChasedAt ? "CHASING" : "AWAITING_RESPONSE";
}

export function assuranceStage(input: { hasRootCause: boolean; verificationOutcome: string | null; effectivenessOutcome: string | null; recurrenceCount: number }) {
  if (input.recurrenceCount > 0 || input.effectivenessOutcome === "INEFFECTIVE") return "REOPENED";
  if (input.effectivenessOutcome === "EFFECTIVE") return "SUSTAINED";
  if (input.verificationOutcome === "VERIFIED") return "MONITORING";
  if (input.hasRootCause) return "ACTION_AND_EVIDENCE";
  return "CAUSE_REVIEW";
}

export async function syncFindingFromAction(tx: Prisma.TransactionClient, action: {
  id: string; organisationId: string; locationId: string | null; reference: string; sourceType: string; sourceRecordId: string | null; sourceReference: string | null; sourceUrl: string | null;
  title: string; description: string; category: string; priority: string; clientId: string | null; staffMemberId: string | null; firstSeenAt: Date; status: string; createdById: string; completionDate: Date | null;
}) {
  const status = action.status === "ARCHIVED" ? "ARCHIVED" : action.status === "COMPLETED" ? "RESOLVED" : "ACTION_LINKED";
  return tx.finding.upsert({
    where: { actionId: action.id },
    create: { organisationId: action.organisationId, locationId: action.locationId, reference: `FND-${action.reference}`, actionId: action.id, sourceType: action.sourceType as never, sourceRecordId: action.sourceRecordId, sourceReference: action.sourceReference, sourceUrl: action.sourceUrl, title: action.title, description: action.description, category: action.category, severity: action.priority as never, clientId: action.clientId, staffMemberId: action.staffMemberId, identifiedAt: action.firstSeenAt, status, createdById: action.createdById, resolvedAt: status === "RESOLVED" ? action.completionDate ?? new Date() : null },
    update: { locationId: action.locationId, sourceType: action.sourceType as never, sourceRecordId: action.sourceRecordId, sourceReference: action.sourceReference, sourceUrl: action.sourceUrl, title: action.title, description: action.description, category: action.category, severity: action.priority as never, clientId: action.clientId, staffMemberId: action.staffMemberId, status, resolvedAt: status === "RESOLVED" ? action.completionDate ?? new Date() : null },
  });
}
