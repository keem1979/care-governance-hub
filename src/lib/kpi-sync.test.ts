import { describe, expect, it } from "vitest";
import {
  compliancePercentage,
  isCurrentComplianceRecord,
  kpiAutoSource,
  KPI_AUTO_SOURCES,
  REGISTER_KPI_KEYS,
} from "@/lib/kpi-sync";

describe("KPI source synchronisation", () => {
  it("maps operational indicators to their source modules", () => {
    expect(REGISTER_KPI_KEYS.falls).toBe("falls");
    expect(REGISTER_KPI_KEYS["medication-errors"]).toBe("medicines-errors");
    expect(KPI_AUTO_SOURCES["overdue-actions"]).toBe("Action Tracker");
    expect(kpiAutoSource("scc-total-calls")).toBe("Monthly local authority KPI return");
  });

  it("calculates compliance percentages to one decimal place", () => {
    expect(compliancePercentage(17, 20)).toBe(85);
    expect(compliancePercentage(2, 3)).toBe(66.7);
    expect(compliancePercentage(0, 0)).toBeNull();
  });

  it("only counts valid, in-date compliance records", () => {
    const at = new Date("2026-07-31T00:00:00Z");
    expect(isCurrentComplianceRecord({ outcome: "VALID", expiryDate: new Date("2026-08-01T00:00:00Z"), nextDueDate: null }, at)).toBe(true);
    expect(isCurrentComplianceRecord({ outcome: "COMPETENT", expiryDate: null, nextDueDate: null }, at)).toBe(true);
    expect(isCurrentComplianceRecord({ outcome: "PENDING", expiryDate: null, nextDueDate: null }, at)).toBe(false);
    expect(isCurrentComplianceRecord({ outcome: "VALID", expiryDate: new Date("2026-07-01T00:00:00Z"), nextDueDate: null }, at)).toBe(false);
  });
});
