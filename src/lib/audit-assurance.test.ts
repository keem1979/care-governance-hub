import { describe, expect, it } from "vitest";
import { auditAssuranceReadiness, auditCriterionKey, auditDenominator } from "@/lib/audit-assurance";

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

  it("excludes not-applicable checks from the denominator", () => {
    expect(auditDenominator([{ answer: "COMPLIANT", score: 100, weighting: 1 }, { answer: "NOT_APPLICABLE", score: null, weighting: 5 }])).toEqual({ applicableCount: 1, notApplicableCount: 1, numerator: 100, denominator: 100, score: 100 });
  });

  it("builds criterion identity independently of database row ids", () => {
    expect(auditCriterionKey("medicines-audit", 2, 4)).toBe("medicines-audit:S2:Q4");
  });
});
