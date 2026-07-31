import { describe, expect, it } from "vitest";
import { calculateKpiReturnSummary, percentage, validateKpiReturn } from "@/lib/kpi-suite";

describe("monthly KPI return", () => {
  it("does not divide by zero", () => {
    expect(percentage(4, 0)).toBeNull();
    expect(calculateKpiReturnSummary({}).successfulDeliveryRate).toBeNull();
  });

  it("calculates delivery and exception rates with clear semantics", () => {
    const summary = calculateKpiReturnSummary({ totalCalls: 100, lateCalls: 3, missedCalls: 1, rescheduledCalls: 2, providerCancelledCalls: 4 });
    expect(summary.successfulDeliveryRate).toBe(90);
    expect(summary.providerExceptionRate).toBe(10);
  });

  it("validates dependent figures", () => {
    const errors = validateKpiReturn({
      restartsOffered: 2,
      eligibleRestartsTaken: 3,
      staffMonthEnd: 4,
      careCertificateValid: 5,
      complaintsClosed: 1,
      complaintsUpheld: 1,
      complaintsNotUpheld: 1,
    });
    expect(errors).toHaveLength(3);
  });
});
