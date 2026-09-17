import { describe, expect, it } from "vitest";
import { complaintAssuranceReadiness, complaintClosureAuthority, complaintDeadlineState, complaintWorkflowStage } from "@/lib/complaint-assurance";

const investigation = { status: "COMPLETED", immediateSafetyConcern: "No immediate safety concern identified", immediateSafetyResponse: null, safeguardingDecision: "Considered — not required", incidentDecision: "Considered — not required", triageSummary: "A proportionate service complaint investigation.", investigationOutcome: "The issue was partly upheld.", remedy: "Apology and process change.", learning: "Improve handover.", recurrenceReview: "No prior matching category at this location.", noFurtherActionRationale: null, responsePreparedAt: new Date(), responseApprovedAt: new Date(), findingsCommunicated: true, remedyCommunicated: true, escalationRightsConfirmed: true };

describe("Complaint Assurance", () => {
  it("keeps response, Action and closure as separate decisions", () => {
    const result = complaintAssuranceReadiness({ riskLevel: "HIGH", investigation, issues: [{ finding: "PARTLY_UPHELD", reasoning: "Records support part of the concern.", actionRequired: true, evidenceCount: 1 }], actions: [{ id: "a", closedAt: null, effectivenessOutcome: null }], acknowledged: true, responseIssued: true, finalResponseEvidence: true, closureEvidenceCount: 1 });
    expect(result.state).toBe("OUTSTANDING_REQUIREMENTS");
    expect(result.outstanding.map((item) => item.key)).toContain("actions");
  });

  it("requires effectiveness for serious closed Actions", () => {
    const result = complaintAssuranceReadiness({ riskLevel: "HIGH", investigation, issues: [{ finding: "UPHELD", reasoning: "Evidence reviewed.", actionRequired: true, evidenceCount: 1 }], actions: [{ id: "a", closedAt: new Date(), effectivenessOutcome: "INEFFECTIVE" }], acknowledged: true, responseIssued: true, finalResponseEvidence: true, closureEvidenceCount: 1 });
    expect(result.outstanding.map((item) => item.key)).toContain("effectiveness");
  });

  it("does not use complainant satisfaction as a closure condition", () => {
    const result = complaintAssuranceReadiness({ riskLevel: "LOW", investigation: { ...investigation, responseApprovedAt: null, recurrenceReview: null }, issues: [{ finding: "NOT_UPHELD", reasoning: "Evidence does not support the concern.", actionRequired: false, evidenceCount: 0 }], actions: [], acknowledged: true, responseIssued: true, finalResponseEvidence: false, closureEvidenceCount: 0 });
    expect(result.state).toBe("READY_FOR_ASSURANCE");
  });

  it("requires separate authority for a Critical Complaint", () => {
    expect(complaintClosureAuthority({ riskLevel: "CRITICAL", actorRoleKey: "registered-manager", actorId: "same", createdById: "same" }).allowed).toBe(false);
    expect(complaintClosureAuthority({ riskLevel: "CRITICAL", actorRoleKey: "organisation-owner", actorId: "owner", createdById: "creator", investigatorId: "investigator" }).allowed).toBe(true);
  });

  it("does not treat a Critical response self-approved by its investigator as ready", () => {
    const result = complaintAssuranceReadiness({ riskLevel: "CRITICAL", investigation: { ...investigation, investigatorId: "same", responseApprovedById: "same" }, issues: [{ finding: "NOT_UPHELD", reasoning: "The governed Evidence does not support the allegation.", actionRequired: false, evidenceCount: 1 }], actions: [], acknowledged: true, responseIssued: true, finalResponseEvidence: true, closureEvidenceCount: 1 });
    expect(result.outstanding.map((item) => item.key)).toContain("response-approval");
  });

  it("calculates workflow and deadline signals deterministically", () => {
    expect(complaintWorkflowStage({ closed: false, reopened: false, acknowledged: false, investigationComplete: false, responseIssued: false, openActions: 0, assuranceReady: false })).toBe("AWAITING_ACKNOWLEDGEMENT");
    expect(complaintDeadlineState({ dueAt: new Date("2026-01-02"), completedAt: new Date("2026-01-03") })).toBe("LATE");
  });
});
