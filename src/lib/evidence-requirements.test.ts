import { describe, expect, it } from "vitest";
import { EVIDENCE_REQUIREMENTS, evidenceRequirementByKey, evidenceRequirementStatus } from "@/lib/evidence-requirements";
import { CQC_EVIDENCE_CATEGORIES, expectedCategories } from "@/lib/inspection-framework";

describe("evidence requirements catalogue", () => {
  it("uses unique keys and covers all five CQC key questions", () => {
    expect(new Set(EVIDENCE_REQUIREMENTS.map((item) => item.key)).size).toBe(EVIDENCE_REQUIREMENTS.length);
    expect(new Set(EVIDENCE_REQUIREMENTS.map((item) => item.keyQuestion))).toEqual(new Set(["SAFE", "EFFECTIVE", "CARING", "RESPONSIVE", "WELL_LED"]));
  });
  it("includes the call log and core governance records", () => {
    expect(evidenceRequirementByKey("responsive-call-log")?.title).toContain("Call log");
    expect(EVIDENCE_REQUIREMENTS.some((item) => item.key === "well-pir")).toBe(true);
  });
  it("identifies gaps and expiry", () => {
    expect(evidenceRequirementStatus([])).toBe("NEEDS_EVIDENCE");
    expect(evidenceRequirementStatus([{ reviewExpiryDate: new Date("2020-01-01") }], new Date("2026-01-01"))).toBe("EXPIRED");
    expect(evidenceRequirementStatus([{ reviewExpiryDate: null }], new Date("2026-01-01"))).toBe("CURRENT");
  });
  it("provides the single 66-item RM inspection baseline with CQC category expectations",()=>{
    expect(EVIDENCE_REQUIREMENTS).toHaveLength(66);
    for(const requirement of EVIDENCE_REQUIREMENTS){const expected=expectedCategories(requirement);expect(expected).toContain("PEOPLES_EXPERIENCE");expect(expected).toContain("PROCESSES");expect(expected.every((item)=>CQC_EVIDENCE_CATEGORIES.includes(item as never))).toBe(true)}
  });
});
