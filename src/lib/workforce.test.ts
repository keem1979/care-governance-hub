import { describe, expect, it } from "vitest";
import { daysUntil, workforceRecordState } from "@/lib/workforce";

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
});
