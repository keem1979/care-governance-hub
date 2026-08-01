import { describe, expect, it } from "vitest";
import {
  COMMISSIONER_KPI_SLUGS,
  AUTO_CALCULATED_KPI_SLUGS,
  commissionerKpiCoverage,
  commissionerKpiValues,
} from "@/lib/commissioner-kpis";

describe("commissioner KPI tracker coverage", () => {
  it("represents every tracker item exactly once", () => {
    expect(commissionerKpiCoverage()).toEqual({
      numericInputs: 43,
      calculatedMeasures: 5,
      nonNumericItems: 1,
      totalItems: 49,
    });
    expect(COMMISSIONER_KPI_SLUGS).toHaveLength(48);
    expect(new Set(COMMISSIONER_KPI_SLUGS).size).toBe(48);
    expect(AUTO_CALCULATED_KPI_SLUGS).toHaveLength(10);
  });

  it("maps entered and calculated values into the scorecard", () => {
    const values = commissionerKpiValues({
      totalCalls: 100,
      lateCalls: 4,
      missedCalls: 1,
      serviceUserCancelledCalls: 5,
      staffMonthEnd: 20,
      newDirectCareStaff: 2,
      newBackOfficeStaff: 1,
      orientationEligible: 4,
      orientationCompleted: 3,
      activeLiveInStaff: 5,
      liveInStaffSupervised: 4,
      competenciesDue: 10,
      competenciesCompleted: 9,
      complaintsOpen: 2,
      complaintsClosed: 8,
    });
    expect(values.get("scc-total-calls")).toBe(100);
    expect(values.get("scc-call-exception-rate")).toBe(10);
    expect(values.get("scc-new-staff-rate")).toBe(15);
    expect(values.get("visits-within-agreed-time")).toBe(90);
    expect(values.get("orientation-completion-rate")).toBe(75);
    expect(values.get("live-in-supervision-rate")).toBe(80);
    expect(values.get("competency-compliance")).toBe(90);
    expect(values.get("complaint-closure-rate")).toBe(80);
  });
});
