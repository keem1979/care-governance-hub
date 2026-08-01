import { describe, expect, it } from "vitest";
import { CARE_QUALITY_REGISTER_KEYS, isQualityAttention, latestKpisBySlug, qualityAreaForRegister } from "@/lib/care-quality";

describe("care quality overview", () => {
  it("maps each source record to one quality area", () => expect(qualityAreaForRegister("mar-audits")?.key).toBe("medicines"));
  it("does not duplicate register keys", () => expect(new Set(CARE_QUALITY_REGISTER_KEYS).size).toBe(CARE_QUALITY_REGISTER_KEYS.length));
  it("flags active and high-risk records", () => { expect(isQualityAttention("IN_REVIEW", "LOW")).toBe(true); expect(isQualityAttention("CLOSED", "HIGH")).toBe(true); expect(isQualityAttention("CLOSED", "LOW")).toBe(false); });
  it("keeps the latest KPI result for each measure", () => { const values=[{kpi:{slug:"care-plan-reviews"},reportingMonth:new Date("2026-06-01"),value:80},{kpi:{slug:"care-plan-reviews"},reportingMonth:new Date("2026-07-01"),value:95}]; expect(latestKpisBySlug(values).get("care-plan-reviews")?.value).toBe(95); });
});
