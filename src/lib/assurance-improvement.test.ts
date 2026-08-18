import { describe, expect, it } from "vitest";
import { assuranceStage, externalDependencyState, validateEffectivenessReview, validateIndependentVerification, validateRootCauseReview } from "@/lib/assurance-improvement";

describe("Phase 3 assurance controls", () => {
  it("requires a structured cause and prevention record", () => expect(() => validateRootCauseReview({ method: "Five Whys", problemStatement: "Repeated missed control check", immediateCauses: [], contributingFactors: [], systemCauses: [], lessons: "Learning recorded here", preventiveControls: "Introduce a second weekly check" })).toThrow(/at least one/i));
  it("prevents owner self-verification for high-risk work", () => expect(() => validateIndependentVerification({ outcome: "VERIFIED", completedWork: "Control was implemented", evidenceSummary: "Audit sample attached", evidenceCount: 1, successMeasureResult: "Ten records passed", rationale: "Evidence supports closure", verifierId: "same", ownerId: "same", priority: "HIGH", verifiedAt: new Date() })).toThrow(/other than/i));
  it("blocks effective outcomes when recurrence exists", () => expect(() => validateEffectivenessReview({ outcome: "EFFECTIVE", observedResult: "Target sustained", decision: "Close monitoring", recurrenceFound: true, reviewDate: new Date("2026-08-18"), verifiedAt: new Date("2026-08-01"), nextReviewDate: null })).toThrow(/recurrence/i));
  it("requires a future review when it is too early to judge", () => expect(() => validateEffectivenessReview({ outcome: "TOO_EARLY", observedResult: "Only one week of data", decision: "Continue monitoring", recurrenceFound: false, reviewDate: new Date("2026-08-18"), verifiedAt: new Date("2026-08-01"), nextReviewDate: null })).toThrow(/follow-up/i));
  it("ages unresolved external dependencies", () => expect(externalDependencyState({ status: "AWAITING_RESPONSE", dueDate: new Date("2026-08-01"), lastChasedAt: null }, new Date("2026-08-18"))).toBe("OVERDUE"));
  it("shows sustained improvement only after an effective review", () => expect(assuranceStage({ hasRootCause: true, verificationOutcome: "VERIFIED", effectivenessOutcome: "EFFECTIVE", recurrenceCount: 0 })).toBe("SUSTAINED"));
});
