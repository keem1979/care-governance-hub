import { describe, expect, it } from "vitest";
import {
  assertIndependentBenchmarkReview,
  assertIndependentMeasureVerification,
  assertPilotTransition,
  benchmarkRequestSchema,
  createMeasureSchema,
  isExternalPayingIntent,
  measureResult,
  serviceReadinessSummary,
  serviceReadinessUpdateSchema,
} from "./launch-readiness";

describe("Phase 11 launch assurance", () => {
  it("allows only controlled pilot status transitions", () => {
    expect(() => assertPilotTransition("ACTIVE", "OUTCOME_REVIEW")).not.toThrow();
    expect(() => assertPilotTransition("PLANNED", "COMPLETE")).toThrow(/cannot move/i);
    expect(() => assertPilotTransition("COMPLETE", "ACTIVE")).toThrow(/cannot move/i);
  });

  it("requires independent measure verification", () => {
    expect(() => assertIndependentMeasureVerification("recorder", "recorder")).toThrow(/different authorised manager/i);
    expect(() => assertIndependentMeasureVerification("recorder", "reviewer")).not.toThrow();
  });

  it("calculates improvement in the declared direction", () => {
    expect(measureResult(20, 12, "LOWER_IS_BETTER")).toMatchObject({ absoluteChange: -8, percentageChange: -40, improved: true });
    expect(measureResult(60, 75, "HIGHER_IS_BETTER")).toMatchObject({ absoluteChange: 15, percentageChange: 25, improved: true });
    expect(measureResult(0, 5, "HIGHER_IS_BETTER").percentageChange).toBeNull();
    expect(measureResult(20, null, "LOWER_IS_BETTER").improved).toBeNull();
  });

  it("rejects impossible percentage measures", () => {
    const result = createMeasureSchema.safeParse({ type: "OVERDUE_ACTION_PERCENT", baselineValue: 101, outcomeValue: 20, sampleSize: 10, measurementMethod: "Same governed report for both periods", evidenceReference: "EVID-101" });
    expect(result.success).toBe(false);
  });

  it("does not treat internal or exploratory interest as external paying intent", () => {
    expect(isExternalPayingIntent("INTERNAL_DBAM", "READY_TO_BUY")).toBe(false);
    expect(isExternalPayingIntent("EXTERNAL_PROVIDER", "DISCOVERY")).toBe(false);
    expect(isExternalPayingIntent("EXTERNAL_PROVIDER", "CONTRACT_REVIEW")).toBe(true);
  });

  it("requires benchmark cohorts of at least ten organisations and independent review", () => {
    expect(benchmarkRequestSchema.safeParse({ permittedMetricKeys: ["ACTION_CLOSURE_DAYS"], minimumCohortSize: 9, dpiaReference: "Approved DPIA reference 2026-11" }).success).toBe(false);
    expect(() => assertIndependentBenchmarkReview("requester", "requester")).toThrow(/different authorised manager/i);
  });

  it("requires evidence for service readiness and does not infer readiness from missing items", () => {
    expect(serviceReadinessUpdateSchema.safeParse({ status: "EVIDENCED", evidenceNote: "short", evidenceId: "" }).success).toBe(false);
    expect(serviceReadinessUpdateSchema.safeParse({ status: "EVIDENCED", evidenceNote: "Current verified recovery exercise report", evidenceId: "4b0cf7fb-3e3d-4e50-a3a5-6dcf763dd271" }).success).toBe(true);
    expect(serviceReadinessSummary([]).ready).toBe(false);
    expect(serviceReadinessSummary([{ required: true, status: "EVIDENCED" }, { required: true, status: "BLOCKED" }])).toMatchObject({ evidenced: 1, blocked: 1, percentage: 50, ready: false });
  });
});
