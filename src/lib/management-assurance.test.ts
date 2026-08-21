import { describe, expect, it } from "vitest";
import { managementAssuranceTest, riskManagementAssurance } from "@/lib/management-assurance";

describe("management assurance test", () => {
  it("reports specific outstanding requirements without a misleading percentage", () => {
    const result = managementAssuranceTest([
      { key: "owner", label: "Owner", met: true, reason: "Assign owner" },
      { key: "evidence", label: "Evidence", met: false, reason: "Link evidence" },
    ]);
    expect(result.state).toBe("OUTSTANDING_REQUIREMENTS");
    expect(result.outstanding.map(({ key }) => key)).toEqual(["evidence"]);
  });

  it("does not treat the live risk record or an unverified upload as independent assurance", () => {
    const result = riskManagementAssurance({
      risk: { cause: "Cause", riskEvent: "Event", consequence: "Consequence", existingControls: "Policy", controlEffectiveness: "EFFECTIVE", controlAssurance: "Audit reviewed", ownerId: "owner", nextReviewDate: new Date("2026-10-01"), residualScore: 6, toleranceScore: 9, status: "MONITORING" },
      independentEvidence: [{ title: "Uploaded audit", assuranceState: "UNVERIFIED" }],
      actions: [],
      now: new Date("2026-08-21"),
    });
    expect(result.outstanding.some(({ key }) => key === "evidence")).toBe(true);
    expect(result.conflicts[0]).toMatch(/rated Effective/i);
  });

  it("requires a linked action for risk outside tolerance", () => {
    const result = riskManagementAssurance({
      risk: { cause: "Cause", riskEvent: "Event", consequence: "Consequence", existingControls: "Control", controlEffectiveness: "PARTIALLY_EFFECTIVE", controlAssurance: "Observation", ownerId: "owner", nextReviewDate: new Date("2026-10-01"), residualScore: 12, toleranceScore: 9, status: "OPEN" },
      independentEvidence: [{ title: "Verified audit", assuranceState: "CURRENT_VERIFIED" }],
      actions: [],
      now: new Date("2026-08-21"),
    });
    expect(result.outstanding.some(({ key }) => key === "treatment")).toBe(true);
  });

  it("does not treat Action completion as proof of effectiveness", () => {
    const result = riskManagementAssurance({
      risk: { cause: "Cause", riskEvent: "Event", consequence: "Consequence", existingControls: "Control", controlEffectiveness: "PARTIALLY_EFFECTIVE", controlAssurance: "Observation", ownerId: "owner", nextReviewDate: new Date("2026-10-01"), residualScore: 6, toleranceScore: 9, status: "MONITORING" },
      independentEvidence: [{ title: "Verified record", assuranceState: "CURRENT_VERIFIED" }],
      actions: [{ reference: "ACT-1", status: "COMPLETED", dueDate: new Date("2026-08-20"), evidenceCount: 1, evidenceRequired: true, effectivenessCount: 0 }],
      now: new Date("2026-08-21"),
    });
    expect(result.outstanding.some(({ key }) => key === "action-effectiveness")).toBe(true);
  });
});
