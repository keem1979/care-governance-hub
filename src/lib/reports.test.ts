import { describe, expect, it } from "vitest";
import {
  filterReportRows,
  isReportType,
  parseReportFilters,
  reportCsv,
  type ReportRow,
} from "@/lib/reports";

const row: ReportRow = {
  type: "Risk",
  reference: "RSK-1",
  title: "Test risk",
  href: "/risks/risk-1",
  date: "2026-07-20",
  location: "Main service",
  category: "Operational",
  status: "OPEN",
  owner: "A Manager",
  detail: "Residual score 6",
  attention: false,
  overdue: false,
  attentionReason: "",
};

describe("reports", () => {
  it("recognises only supported report types", () => {
    expect(isReportType("board-summary")).toBe(true);
    expect(isReportType("unknown")).toBe(false);
  });

  it("accepts only authorised location filters", () => {
    expect(parseReportFilters({ location: "allowed" }, ["allowed"]).locationId).toBe("allowed");
    expect(parseReportFilters({ location: "blocked" }, ["allowed"]).locationId).toBeUndefined();
  });

  it("filters real rows by date, status and category", () => {
    const filters = parseReportFilters({ from: "2026-07-01", to: "2026-07-31", status: "OPEN", category: "Operational" }, []);
    expect(filterReportRows([row], filters)).toEqual([row]);
    expect(filterReportRows([{ ...row, status: "CLOSED" }], filters)).toEqual([]);
  });

  it("escapes report CSV values", () => {
    expect(reportCsv([{ ...row, title: 'Risk, "high"' }])).toContain('"Risk, ""high"""');
  });

  it("rejects impossible calendar dates", () => {
    expect(parseReportFilters({ from: "2026-02-31" }, []).from).toBeUndefined();
  });
});
