import { describe, expect, it } from "vitest";
import { auditAssuranceReadiness, auditCriterionKey, auditDenominator, auditFindingNextStep } from "@/lib/audit-assurance";

describe("audit assurance", () => {
  it("keeps a high score subordinate to an unresolved critical finding", () => {
    const result = auditAssuranceReadiness({ status: "COMPLETED", mandatoryQuestionCount: 10, mandatoryAnsweredCount: 10, fieldworkCompletedAt: new Date(), findings: [{ severity: "CRITICAL", resolvedAt: null, actionRequired: true, action: { closedAt: null }, reaudits: [] }] });
    expect(result.ready).toBe(false);
    expect(result.criticalDominates).toBe(true);
  });

  it("does not treat a closed action as finding resolution", () => {
    const result = auditAssuranceReadiness({ status: "COMPLETED", mandatoryQuestionCount: 1, mandatoryAnsweredCount: 1, fieldworkCompletedAt: new Date(), findings: [{ severity: "LOW", resolvedAt: null, actionRequired: true, action: { closedAt: new Date() }, reaudits: [] }] });
    expect(result.outstanding.map((item) => item.key)).toContain("findings");
  });

  it("does not use an older resolved re-audit after a later deterioration", () => {
    const result = auditAssuranceReadiness({ status: "COMPLETED", mandatoryQuestionCount: 1, mandatoryAnsweredCount: 1, fieldworkCompletedAt: new Date(), findings: [{ severity: "HIGH", resolvedAt: new Date(), actionRequired: true, action: { closedAt: new Date() }, reaudits: [{ outcome: "DETERIORATED" }, { outcome: "RESOLVED" }] }] });
    expect(result.outstanding.map((item) => item.key)).toContain("material-reaudit");
  });

  it("does not accept a resolved re-audit when its linked Evidence is no longer eligible", () => {
    const result = auditAssuranceReadiness({ status: "COMPLETED", mandatoryQuestionCount: 1, mandatoryAnsweredCount: 1, fieldworkCompletedAt: new Date(), findings: [{ severity: "HIGH", resolvedAt: new Date(), actionRequired: true, action: { closedAt: new Date() }, reaudits: [{ outcome: "RESOLVED", evidenceEligible: false }] }] });
    expect(result.outstanding.map((item) => item.key)).toContain("material-reaudit");
  });

  it("shows the next governed step without treating an Action as finding resolution", () => {
    const base = { resolvedAt: null, evidenceLinks: [{}], actionRequired: true, action: { closedAt: new Date() }, severity: "HIGH", reaudits: [{ outcome: "RESOLVED" }] };
    expect(auditFindingNextStep({ ...base, evidenceLinks: [] })).toBe("Link supporting Evidence");
    expect(auditFindingNextStep({ ...base, action: null })).toBe("Create the corrective Action");
    expect(auditFindingNextStep({ ...base, reaudits: [{ outcome: "DETERIORATED" }, { outcome: "RESOLVED" }] })).toBe("Record a targeted re-audit with eligible Evidence");
    expect(auditFindingNextStep({ ...base, reaudits: [{ outcome: "RESOLVED", evidenceEligible: false }] })).toBe("Record a targeted re-audit with eligible Evidence");
    expect(auditFindingNextStep(base)).toBe("Record a finding resolution decision");
  });

  it("excludes not-applicable checks from the denominator", () => {
    expect(auditDenominator([{ answer: "COMPLIANT", score: 100, weighting: 1 }, { answer: "NOT_APPLICABLE", score: null, weighting: 5 }])).toEqual({ applicableCount: 1, notApplicableCount: 1, numerator: 100, denominator: 100, score: 100 });
  });

  it("builds criterion identity independently of database row ids", () => {
    expect(auditCriterionKey("medicines-audit", 2, 4)).toBe("medicines-audit:S2:Q4");
  });
});
