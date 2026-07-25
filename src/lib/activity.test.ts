import { describe, expect, it } from "vitest";
import { activityCsv, parseActivityFilters, safeActivityValue } from "@/lib/activity";

describe("activity log", () => {
  it("accepts only authorised locations", () => {
    expect(parseActivityFilters({ location: "allowed" }, ["allowed"]).locationId).toBe("allowed");
    expect(parseActivityFilters({ location: "blocked" }, ["allowed"]).locationId).toBeUndefined();
  });

  it("limits invalid pages and search length", () => {
    expect(parseActivityFilters({ page: "-2" }, []).page).toBe(1);
    expect(parseActivityFilters({ q: "x".repeat(200) }, []).q).toHaveLength(120);
  });

  it("redacts sensitive change values recursively", () => {
    expect(safeActivityValue({ token: "secret", nested: { passwordHash: "hash", status: "OPEN" } })).toEqual({ token: "[REDACTED]", nested: { passwordHash: "[REDACTED]", status: "OPEN" } });
  });

  it("exports escaped CSV without sensitive values", () => {
    const csv = activityCsv([{ createdAt: new Date("2026-07-25T12:00:00Z"), user: { name: "A User", email: "a@example.com" }, location: null, action: "UPDATE", recordType: "Policy", recordId: "p1", summary: 'Changed "policy"', beforeValue: { secret: "hidden" }, afterValue: { status: "APPROVED" } }]);
    expect(csv).toContain('"Changed ""policy"""');
    expect(csv).not.toContain("hidden");
  });
});
