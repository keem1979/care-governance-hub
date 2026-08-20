import { describe, expect, it } from "vitest";
import { extractWorkTarget, filterMyWork, myWorkUrgency, type MyWorkItem } from "@/lib/my-work";

const now = new Date(2026, 7, 20, 12);
const item = (key: string, targetAt: Date | null, priority: MyWorkItem["priority"] = "MEDIUM"): MyWorkItem => ({
  key, source: "Action", reference: key, title: key, detail: "Assigned work", href: "/actions/1", targetAt, priority, state: "OPEN", locationName: "Main service",
});

describe("my work", () => {
  it("separates overdue, near-term, later and missing targets", () => {
    expect(myWorkUrgency(new Date(2026, 7, 19), now)).toBe("OVERDUE");
    expect(myWorkUrgency(new Date(2026, 7, 25), now)).toBe("DUE_SOON");
    expect(myWorkUrgency(new Date(2026, 8, 20), now)).toBe("UPCOMING");
    expect(myWorkUrgency(null, now)).toBe("NEEDS_TARGET");
  });

  it("puts overdue and higher-priority work first", () => {
    const result = filterMyWork([
      item("later", new Date(2026, 8, 20), "CRITICAL"),
      item("overdue-low", new Date(2026, 7, 19), "LOW"),
      item("overdue-high", new Date(2026, 7, 19), "HIGH"),
    ], "ALL", now);
    expect(result.map(({ key }) => key)).toEqual(["overdue-high", "overdue-low", "later"]);
  });

  it("reads common target fields from structured register data", () => {
    expect(extractWorkTarget({ reviewDueDate: "2026-09-01" })?.toISOString()).toContain("2026-09-01");
    expect(extractWorkTarget({ notes: "No target" })).toBeNull();
  });
});
