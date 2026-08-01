import { describe, expect, it } from "vitest";
import { daysUntil, leaveYearRange, trainingMatrixState, workingDaysInclusive, workforceRecordState } from "@/lib/workforce";

describe("workforce compliance", () => {
  const now = new Date("2026-07-27T12:00:00.000Z");

  it("treats expired checks and overdue assessments as overdue", () => {
    expect(
      workforceRecordState(
        { outcome: "VALID", expiryDate: "2026-07-26T00:00:00.000Z" },
        now,
      ),
    ).toBe("OVERDUE");
  });

  it("flags development-required competencies", () => {
    expect(workforceRecordState({ outcome: "DEVELOPMENT_REQUIRED" }, now)).toBe(
      "ACTION_REQUIRED",
    );
  });

  it("calculates calendar days to expiry", () => {
    expect(daysUntil("2026-08-06T12:00:00.000Z", now)).toBe(10);
  });

  it("calculates weekdays for an inclusive leave request", () => {
    expect(workingDaysInclusive("2026-08-03", "2026-08-09")).toBe(5);
  });

  it("finds the current organisation leave year", () => {
    const range = leaveYearRange(4, 1, new Date("2026-02-10T12:00:00Z"));
    expect(range.start.toISOString()).toContain("2025-04-01");
    expect(range.end.toISOString()).toContain("2026-04-01");
  });

  it("separates missing, due soon and expired training", () => {
    expect(trainingMatrixState({}, now)).toBe("MISSING");
    expect(trainingMatrixState({ outcome: "VALID", expiryDate: "2026-08-06" }, now)).toBe("DUE_SOON");
    expect(trainingMatrixState({ outcome: "VALID", expiryDate: "2026-07-01" }, now)).toBe("EXPIRED");
  });
});
