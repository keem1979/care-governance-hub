import { describe, expect, it } from "vitest";
import {
  automatedKpiSource,
  KPI_SOURCE_OPTIONS,
  kpiSourceLabel,
  normaliseKpiSourceType,
  normaliseKpiSourceUrl,
} from "@/lib/kpi-sources";

describe("KPI evidence sources", () => {
  it("offers care management system as a selectable source", () => {
    expect(KPI_SOURCE_OPTIONS).toContainEqual({ value: "CARE_MANAGEMENT_SYSTEM", label: "Care management system" });
  });

  it("requires a recognised source and accepts its human label", () => {
    expect(normaliseKpiSourceType("Care management system")).toBe("CARE_MANAGEMENT_SYSTEM");
    expect(() => normaliseKpiSourceType("")).toThrow("Choose where this figure came from.");
  });

  it("accepts safe web and internal source links", () => {
    expect(normaliseKpiSourceUrl("https://care.example/record/1")).toBe("https://care.example/record/1");
    expect(normaliseKpiSourceUrl("/registers")).toBe("/registers");
    expect(normaliseKpiSourceUrl("")).toBeNull();
    expect(() => normaliseKpiSourceUrl("javascript:alert(1)")).toThrow("http or https");
  });

  it("gives automatic KPI figures an auditable system source", () => {
    expect(automatedKpiSource("audit-completion")).toEqual({ sourceType: "QCGMS_MODULE", sourceUrl: "/audits" });
    expect(kpiSourceLabel("MONTHLY_PERFORMANCE_RETURN")).toBe("Monthly performance return");
  });
});
