import { describe, expect, it } from "vitest";
import {
  dashboardModules,
  dashboardSummaries,
  reportingMonth,
} from "../../src/lib/dashboard";

describe("dashboard configuration", () => {
  it("uses explicit no-data states for domain modules that are not built", () => {
    const summaries = dashboardSummaries();

    expect(summaries).toHaveLength(10);
    expect(summaries.every(({ value }) => value === null)).toBe(true);
    expect(summaries.every(({ qualifier }) => qualifier.includes("not yet built"))).toBe(
      true,
    );
  });

  it("reports only foundation controls as ready", () => {
    const modules = dashboardModules();

    expect(modules.filter(({ status }) => status === "ready")).toEqual([
      expect.objectContaining({ name: "Foundation controls" }),
    ]);
    expect(modules.filter(({ status }) => status === "no-data")).toHaveLength(5);
  });

  it("formats the reporting month in UK time", () => {
    expect(reportingMonth(new Date("2026-07-31T23:30:00.000Z"))).toBe(
      "August 2026",
    );
  });
});
