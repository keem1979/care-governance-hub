import { describe, expect, it } from "vitest";
import { classifyMaterialChange } from "@/lib/material-changes";

const change = (sectionKey: string, overrides: Record<string, unknown> = {}) => ({ id: "change", sectionKey, fieldPath: sectionKey, changeType: "AMENDED", previousValue: {}, proposedValue: {}, reason: "Review", riskImpact: "MEDIUM", ...overrides });

describe("material change classification", () => {
  it("routes risk changes to risk and action review", () => {
    const result = classifyMaterialChange(change("risks", { changeType: "RISK_INCREASED", riskImpact: "HIGH" }));
    expect(result.category).toBe("RISK");
    expect(result.severity).toBe("HIGH");
    expect(result.dependencies.map((item) => item.type)).toEqual(expect.arrayContaining(["RISK_REGISTER", "ACTION_TRACKER"]));
  });

  it("treats removal of medication information as high severity", () => {
    const result = classifyMaterialChange(change("medication", { changeType: "REMOVED", riskImpact: "LOW" }));
    expect(result.severity).toBe("HIGH");
    expect(result.dependencies.map((item) => item.type)).toContain("STAFF_COMPETENCY");
  });

  it("requires assessment review for consent and capacity changes", () => {
    expect(classifyMaterialChange(change("capacityConsent")).dependencies.map((item) => item.type)).toContain("ASSESSMENT");
  });
});
