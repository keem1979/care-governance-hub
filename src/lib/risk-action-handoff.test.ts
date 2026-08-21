import { describe, expect, it } from "vitest";
import { riskActionPrefill } from "@/lib/risk-action-handoff";

describe("Risk to canonical Action handoff", () => {
  it("maps treatment, scope, owner, due date and assurance without claiming target achievement", () => {
    const result = riskActionPrefill({
      reference: "RSK-001", title: "Missed medicines", category: "Medicines",
      furtherControls: "Complete competency reassessment.", locationId: "location", ownerId: "manager",
      targetDate: new Date("2026-09-30T00:00:00Z"), residualLevel: "HIGH", residualScore: 12,
      targetScore: 4, controlAssurance: "MAR re-audit shows no repeat omissions",
    }, "fallback", new Set(["manager"]));
    expect(result).toMatchObject({ title: "Complete competency reassessment.", category: "Medicines", locationId: "location", ownerId: "manager", oversightOwnerId: "manager", priority: "HIGH", dueDate: "2026-09-30" });
    expect(result.expectedOutcome).toMatch(/not an automatically achieved result/i);
    expect(result.successMeasure).toMatch(/formal Risk review/i);
  });
});
