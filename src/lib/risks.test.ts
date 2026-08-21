import { describe, expect, it } from "vitest";
import { addReviewFrequency, assertRiskGeneralMutationAllowed, isOutsideTolerance, makeRiskReference, riskLevel, riskNeedsEscalation, riskScore, validateRiskClosure, validateRiskPlan } from "@/lib/risks";

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
  it("requires appropriate supporting evidence for closure", () => expect(() => validateRiskClosure({ status: "CLOSED", level: "LOW", rationale: "Controlled", supportingEvidenceCount: 0 })).toThrow(/sufficient appropriate supporting evidence/i));
  it("permits proportionate low-risk closure without separate verification", () => expect(() => validateRiskClosure({ status: "CLOSED", level: "LOW", rationale: "Controlled", ownerId: "owner", approverId: "owner", actorId: "owner", closureDate: new Date(), supportingEvidenceCount: 1, unresolvedActionCount: 0 })).not.toThrow());
  it("blocks closure while the residual risk remains outside tolerance", () => expect(() => validateRiskClosure({ status: "CLOSED", level: "MODERATE", residualScore: 6, toleranceScore: 4, rationale: "Controlled", ownerId: "owner", approverId: "owner", actorId: "owner", closureDate: new Date(), supportingEvidenceCount: 1, unresolvedActionCount: 0 })).toThrow(/formal risk review/i));
  it("blocks high-risk self approval", () => expect(() => validateRiskClosure({ status: "CLOSED", level: "HIGH", rationale: "Controlled", ownerId: "owner", approverId: "owner", actorId: "owner", closureDate: new Date(), supportingEvidenceCount: 1, verifiedCurrentEvidenceCount: 1 })).toThrow(/self-approved/i));
  it("allows high-risk closure with current verified evidence and separate approval", () => expect(() => validateRiskClosure({ status: "CLOSED", level: "HIGH", rationale: "Controlled", ownerId: "owner", approverId: "approver", actorId: "approver", closureDate: new Date(), supportingEvidenceCount: 1, verifiedCurrentEvidenceCount: 1, unresolvedActionCount: 0 })).not.toThrow());
  it("blocks direct API-style closure mutations outside the governed endpoint",()=>{
    expect(()=>assertRiskGeneralMutationAllowed("CLOSED","OPEN")).toThrow(/closure proposal workflow/i);
    expect(()=>assertRiskGeneralMutationAllowed("MONITORING","CLOSURE_PROPOSED")).toThrow(/cannot be edited/i);
    expect(()=>assertRiskGeneralMutationAllowed("MONITORING","OPEN")).not.toThrow();
  });
});
