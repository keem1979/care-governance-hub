import { describe, expect, it } from "vitest";
import { complaintActionPrefill } from "@/lib/complaint-action-handoff";

describe("Complaint to canonical Action handoff", () => {
  it("maps the selected issue, scope, owner, remedy and effectiveness requirement without closing the Complaint", () => {
    const result = complaintActionPrefill({
      reference: "CMP-001",
      title: "Communication concern",
      summary: "A concern was investigated.",
      riskLevel: "HIGH",
      locationId: "location",
      ownerId: "manager",
      data: {},
      complaintInvestigation: { remedy: "Introduce and test the revised handover.", learning: "Make escalation visible.", investigationOutcome: "Partly upheld." },
      complaintIssues: [{ id: "issue-1", sequence: 1, category: "Communication", concern: "Handover was incomplete.", reasoning: "The record confirms a gap." }],
    }, "fallback", new Set(["manager"]), "issue-1");

    expect(result).toMatchObject({ category: "Complaints", locationId: "location", ownerId: "manager", oversightOwnerId: "manager", priority: "HIGH" });
    expect(result.title).toContain("CMP-001");
    expect(result.expectedOutcome).toContain("revised handover");
    expect(result.successMeasure).toMatch(/effectiveness/i);
    expect(result.progressNote).toContain("Complaint learning");
  });
});
