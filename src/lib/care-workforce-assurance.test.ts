import { describe, expect, it } from "vitest";
import { competencyMatchState, isCriticalCareChange, understandingPrompt } from "@/lib/care-workforce-assurance";

describe("care and workforce assurance", () => {
  it("requires an understanding check for critical or safety-related changes", () => {
    expect(isCriticalCareChange({ overallRisk: "CRITICAL", materialSections: [] })).toBe(true);
    expect(isCriticalCareChange({ overallRisk: "LOW", materialSections: ["Medication support"] })).toBe(true);
    expect(isCriticalCareChange({ overallRisk: "LOW", materialSections: ["About Me"] })).toBe(false);
  });

  it("creates a source-specific prompt without inventing an answer", () => {
    expect(understandingPrompt("CP-2026-0001", 3, ["Safeguarding plan"])).toContain("CP-2026-0001 version 3");
  });

  it("matches only verified, current competency records", () => {
    const now = new Date("2026-08-18T12:00:00Z");
    expect(competencyMatchState(undefined, now)).toBe("NOT_RECORDED");
    expect(competencyMatchState({ outcome: "VALID", verifiedAt: null, expiryDate: null }, now)).toBe("NOT_VERIFIED");
    expect(competencyMatchState({ outcome: "VALID", verifiedAt: now, expiryDate: new Date("2026-08-17") }, now)).toBe("EXPIRED");
    expect(competencyMatchState({ outcome: "VALID", verifiedAt: now, expiryDate: new Date("2027-08-18") }, now)).toBe("CURRENT");
  });
});
