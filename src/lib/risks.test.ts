import { describe, expect, it } from "vitest";
import { addReviewFrequency, isOutsideTolerance, makeRiskReference, riskLevel, riskNeedsEscalation, riskScore, validateRiskClosure, validateRiskPlan } from "@/lib/risks";

describe("risk scoring", () => {
  it.each([[1,1,1,"LOW"],[2,3,6,"MODERATE"],[4,4,16,"HIGH"],[5,5,25,"CRITICAL"]] as const)("scores %i x %i", (likelihood, impact, score, level) => {
    expect(riskScore(likelihood, impact)).toBe(score);
    expect(riskLevel(score)).toBe(level);
  });
  it("rejects values outside the matrix", () => expect(() => riskScore(0, 5)).toThrow(/1 to 5/));
});

describe("risk workflow", () => {
  it("creates readable references", () => expect(makeRiskReference(new Date("2026-07-25T00:00:00Z"), 7)).toBe("RSK-20260725-007"));
  it("calculates review dates", () => expect(addReviewFrequency(new Date("2026-07-25T12:00:00Z"), "Quarterly").toISOString().slice(0, 10)).toBe("2026-10-25"));
  it("calculates weekly review dates", () => expect(addReviewFrequency(new Date("2026-07-25T12:00:00Z"), "Weekly").toISOString().slice(0, 10)).toBe("2026-08-01"));
  it("flags scores outside tolerance",()=>{expect(isOutsideTolerance(12,9)).toBe(true);expect(riskNeedsEscalation(25,25)).toBe(true);});
  it("requires a reason when risk is accepted",()=>expect(()=>validateRiskPlan({residualScore:12,targetScore:12,toleranceScore:9,ownerId:"user",treatmentStrategy:"ACCEPT"})).toThrow(/acceptable/));
  it("guards high-risk closure", () => expect(() => validateRiskClosure({ status: "CLOSED", level: "HIGH", rationale: "Controlled" })).toThrow(/approval/));
  it("allows approved high-risk closure", () => expect(() => validateRiskClosure({ status: "CLOSED", level: "HIGH", rationale: "Controlled", approverId: "user", closureDate: new Date() })).not.toThrow());
});
