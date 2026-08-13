import { describe, expect, it } from "vitest";
import { activityChanges, activityCsv, activityRecordHref, parseActivityFilters, safeActivityValue } from "@/lib/activity";

describe("activity log", () => {
  it("accepts only authorised locations", () => {
    expect(parseActivityFilters({ location: "allowed" }, ["allowed"]).locationId).toBe("allowed");
    expect(parseActivityFilters({ location: "blocked" }, ["allowed"]).locationId).toBeUndefined();
  });

  it("limits invalid pages and search length", () => {
    expect(parseActivityFilters({ page: "-2" }, []).page).toBe(1);
    expect(parseActivityFilters({ q: "x".repeat(200) }, []).q).toHaveLength(120);
  });

  it("accepts only supported actions and investigation views", () => {
    expect(parseActivityFilters({ action: "DELETE", focus: "unknown" }, []).action).toBeUndefined();
    expect(parseActivityFilters({ focus: "security" }, []).focus).toBe("security");
  });

  it("rejects impossible dates", () => {
    expect(parseActivityFilters({ from: "2026-02-31" }, []).from).toBeUndefined();
  });

  it("redacts sensitive change values recursively", () => {
    expect(safeActivityValue({ token: "secret", nested: { passwordHash: "hash", status: "OPEN" } })).toEqual({ token: "[REDACTED]", nested: { passwordHash: "[REDACTED]", status: "OPEN" } });
  });

  it("links supported activity events back to their source record", () => {
    expect(activityRecordHref("Policy", "p1")).toBe("/policies/p1");
    expect(activityRecordHref("Login", null)).toBeNull();
  });

  it("turns snapshots into a readable field-level change schedule", () => {
    expect(activityChanges({ status: "DRAFT", owner: { name: "A" } }, { status: "APPROVED", owner: { name: "A" } })).toEqual([{ field: "Status", before: "DRAFT", after: "APPROVED" }]);
  });

  it("exports escaped CSV without sensitive values", () => {
    const csv = activityCsv([{ id: "event-1", createdAt: new Date("2026-07-25T12:00:00Z"), user: { name: "A User", email: "a@example.com" }, location: null, action: "UPDATE", recordType: "Policy", recordId: "p1", summary: 'Changed "policy"', beforeValue: { secret: "hidden" }, afterValue: { status: "APPROVED" } }]);
    expect(csv).toContain('"Changed ""policy"""');
    expect(csv).not.toContain("hidden");
  });
});
