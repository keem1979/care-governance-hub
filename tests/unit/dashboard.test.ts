import { describe, expect, it } from "vitest";
import {
  dashboardModules,
  dashboardSummaries,
  reportingMonth,
} from "../../src/lib/dashboard";

describe("dashboard configuration", () => {
  it("uses live counts for completed policy and evidence modules", () => {
    const summaries = dashboardSummaries({ policiesDue: 2, overdueAudits: 1, trainingEvidenceExpiring: 3, documentsExpiring: 4, openComplaints: 5, openSafeguarding: 1, incidentsAwaitingReview: 2, risksOverdueReview: 6, openHighRiskActions: 7, overdueActions: 8, governanceMeetingsDue: 3 });

    expect(summaries).toHaveLength(10);
    expect(summaries.find(({ label }) => label === "Policies due for review")?.value).toBe(2);
    expect(summaries.find(({ label }) => label === "Overdue audits")?.value).toBe(1);
    expect(summaries.find(({ label }) => label === "Training evidence expiring")?.value).toBe(3);
    expect(summaries.find(({ label }) => label === "Documents expiring in 30 days")?.value).toBe(4);
    expect(summaries.find(({ label }) => label === "Open complaints")?.value).toBe(5);
    expect(summaries.find(({ label }) => label === "Risks overdue for review")?.value).toBe(6);
    expect(summaries.find(({ label }) => label === "Open high-risk actions")?.value).toBe(7);
    expect(summaries.find(({ label }) => label === "Governance meetings due")?.value).toBe(3);
  });

  it("reports foundation plus policy and evidence controls as ready", () => {
    const modules = dashboardModules();

    expect(modules.filter(({ status }) => status === "ready")).toHaveLength(5);
    expect(modules.filter(({ status }) => status === "no-data")).toHaveLength(1);
  });

  it("formats the reporting month in UK time", () => {
    expect(reportingMonth(new Date("2026-07-31T23:30:00.000Z"))).toBe(
      "August 2026",
    );
  });
});
