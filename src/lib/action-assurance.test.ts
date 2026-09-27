import { describe, expect, it } from "vitest";
import { actionAssurancePolicy, actionAssuranceReadiness, currentAssuranceCycle, evaluateActionClosureAuthority } from "@/lib/action-assurance";

describe("role-aware Action assurance", () => {
  it("keeps a low manual administration Action proportionate", () => {
    expect(actionAssurancePolicy("LOW", "MANUAL")).toMatchObject({ verificationRequired: false, effectivenessRequired: false, separateCloserRequired: false });
  });
  it("requires verification, effectiveness and separation for a High Medicines Risk Action", () => {
    const result = actionAssuranceReadiness({ priority: "HIGH", sourceType: "RISK", progressPercent: 100, completionDate: new Date(), ownerId: "owner", closerId: "closer", verification: { outcome: "VERIFIED", verifierId: "verifier" }, effectiveness: { outcome: "EFFECTIVE", recurrenceFound: false }, roleCounts: { COMPLETION: 1, VERIFICATION: 1, EFFECTIVENESS: 1, CLOSURE: 1 }, unresolvedDependencies: 0, rootCauseComplete: true });
    expect(result.ready).toBe(true);
  });
  it("does not equate verification with effectiveness", () => {
    const result = actionAssuranceReadiness({ priority: "HIGH", sourceType: "RISK", progressPercent: 100, completionDate: new Date(), ownerId: "owner", closerId: "closer", verification: { outcome: "VERIFIED", verifierId: "verifier" }, effectiveness: null, roleCounts: { COMPLETION: 1, VERIFICATION: 1, CLOSURE: 1 }, unresolvedDependencies: 0, rootCauseComplete: true });
    expect(result.ready).toBe(false);
    expect(result.outstanding.map((item) => item.key)).toContain("effectiveness");
  });
  it("blocks High Action closure by owner or verifier", () => {
    const result = actionAssuranceReadiness({ priority: "HIGH", sourceType: "RISK", progressPercent: 100, completionDate: new Date(), ownerId: "owner", closerId: "verifier", verification: { outcome: "VERIFIED", verifierId: "verifier" }, effectiveness: { outcome: "EFFECTIVE", recurrenceFound: false }, roleCounts: { COMPLETION: 1, VERIFICATION: 1, EFFECTIVENESS: 1, CLOSURE: 1 }, unresolvedDependencies: 0, rootCauseComplete: true });
    expect(result.outstanding.map((item) => item.key)).toContain("separate-closer");
  });
  it("uses the latest rejected Verification as a current assurance blocker", () => {
    const result = actionAssuranceReadiness({ priority: "HIGH", sourceType: "RISK", progressPercent: 100, completionDate: new Date(), ownerId: "owner", closerId: "closer", verification: { outcome: "FAILED", verifierId: "verifier" }, effectiveness: null, roleCounts: { COMPLETION: 1, VERIFICATION: 1 }, unresolvedDependencies: 0, rootCauseComplete: true });
    expect(result.ready).toBe(false);
    expect(result.outstanding.find((check) => check.key === "verification")?.reason).toMatch(/not accepted/i);
  });
  it("separates Action capability from provider governance authority", () => {
    expect(evaluateActionClosureAuthority({ hasActionCapability: true, actorRoleKey: "action-administrator", authorisedRoleKeys: ["registered-manager"] })).toMatchObject({ capability: true, governanceAuthority: false, allowed: false, configurationIssue: false });
    expect(evaluateActionClosureAuthority({ hasActionCapability: false, actorRoleKey: "nominated-individual", authorisedRoleKeys: ["nominated-individual"] })).toMatchObject({ capability: false, governanceAuthority: true, allowed: false, configurationIssue: true });
    expect(evaluateActionClosureAuthority({ hasActionCapability: true, actorRoleKey: "registered-manager", authorisedRoleKeys: ["registered-manager"] })).toMatchObject({ capability: true, governanceAuthority: true, allowed: true, configurationIssue: false });
  });
  it("does not reuse assurance decisions from before a reopening", () => {
    const reopenedAt = new Date("2026-01-01T12:00:00.000Z");
    const old = { createdAt: new Date("2026-01-01T11:00:00.000Z") };
    const completionDate = new Date("2026-01-01T13:00:00.000Z");
    expect(currentAssuranceCycle({ reopenedAt, completionDate: null, verifications: [old], effectivenessReviews: [old] })).toMatchObject({ verification: null, effectiveness: null });
    expect(currentAssuranceCycle({ reopenedAt, completionDate, verifications: [old], effectivenessReviews: [old] })).toMatchObject({ verification: null, effectiveness: null });
    const freshVerification = { createdAt: new Date("2026-01-01T14:00:00.000Z") };
    expect(currentAssuranceCycle({ reopenedAt, completionDate, verifications: [freshVerification, old], effectivenessReviews: [old] })).toMatchObject({ verification: freshVerification, effectiveness: null });
    const freshEffectiveness = { createdAt: new Date("2026-01-01T15:00:00.000Z") };
    expect(currentAssuranceCycle({ reopenedAt, completionDate, verifications: [freshVerification, old], effectivenessReviews: [freshEffectiveness, old] })).toMatchObject({ verification: freshVerification, effectiveness: freshEffectiveness });
  });
});
