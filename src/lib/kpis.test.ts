import { describe, expect, it } from "vitest";
import { addMonths, calculateKpiRag, monthKey, parseCsv, parseKpiMonth } from "@/lib/kpis";

describe("KPI calculations", () => {
  it("calculates higher-is-better RAG", () => {
    expect(calculateKpiRag({ actual: 96, direction: "HIGHER_IS_BETTER", greenThreshold: 95, amberThreshold: 85 })).toBe("GREEN");
    expect(calculateKpiRag({ actual: 90, direction: "HIGHER_IS_BETTER", greenThreshold: 95, amberThreshold: 85 })).toBe("AMBER");
    expect(calculateKpiRag({ actual: 70, direction: "HIGHER_IS_BETTER", greenThreshold: 95, amberThreshold: 85 })).toBe("RED");
  });
  it("calculates lower-is-better RAG", () => {
    expect(calculateKpiRag({ actual: 0, direction: "LOWER_IS_BETTER", greenThreshold: 0, amberThreshold: 2 })).toBe("GREEN");
    expect(calculateKpiRag({ actual: 1, direction: "LOWER_IS_BETTER", greenThreshold: 0, amberThreshold: 2 })).toBe("AMBER");
    expect(calculateKpiRag({ actual: 3, direction: "LOWER_IS_BETTER", greenThreshold: 0, amberThreshold: 2 })).toBe("RED");
  });
  it("rejects reversed thresholds", () => expect(() => calculateKpiRag({ actual: 90, direction: "HIGHER_IS_BETTER", greenThreshold: 80, amberThreshold: 90 })).toThrow());
  it("normalises reporting months", () => expect(monthKey(parseKpiMonth("2026-07"))).toBe("2026-07"));
  it("moves across year boundaries", () => expect(monthKey(addMonths(new Date("2026-12-01T12:00:00Z"), 1))).toBe("2027-01"));
  it("parses quoted CSV cells", () => expect(parseCsv('kpi,notes\nTraining,"Good, stable"')[1]).toEqual(["Training", "Good, stable"]));
});
