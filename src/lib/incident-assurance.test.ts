import { describe, expect, it } from "vitest";
import { incidentAssuranceReadiness, incidentClosureAuthority } from "@/lib/incident-assurance";

const completeData = {
  immediateResponse: "Person supported, clinical advice obtained and immediate risk controlled.",
  harmLevel: "Moderate harm",
  safeguardingReferral: false,
  cqcNotification: true,
  dutyOfCandour: true,
};

const investigation = {
  status: "COMPLETED",
  factualChronology: "Contemporaneous records and accounts were reconciled.",
  rootCause: "The escalation prompt was not visible at the decision point.",
  notificationDecisionSummary: "The RM considered each route and recorded the accountable decision.",
  personRepresentativeInvolvement: "The person and representative reviewed the factual outcome.",
  learning: "Escalation prompts must be visible and tested.",
  learningSharedWith: "Shared in team learning and supervision.",
  affectedRecordsReviewed: "Care plan and risk assessment reviewed through controlled change.",
  outcome: "Immediate harm addressed; preventive action tested.",
  noFurtherActionRationale: null,
};

describe("incident assurance", () => {
  it("keeps a High incident open when an Action is complete but not effective", () => {
    const result = incidentAssuranceReadiness({ riskLevel: "HIGH", data: completeData, investigation, actions: [{ id: "a1", closedAt: new Date(), effectivenessOutcome: "PARTIALLY_EFFECTIVE" }], closureEvidenceCount: 1 });
    expect(result.ready).toBe(false);
    expect(result.outstanding.map((item) => item.key)).toContain("effectiveness");
  });

  it("permits proportionate Low closure without separate Evidence", () => {
    const result = incidentAssuranceReadiness({ riskLevel: "LOW", data: completeData, investigation: null, actions: [], closureEvidenceCount: 0 });
    expect(result.ready).toBe(true);
  });

  it("blocks self-assurance of a Critical incident", () => {
    const result = incidentClosureAuthority({ riskLevel: "CRITICAL", actorRoleKey: "registered-manager", actorId: "u1", createdById: "u2", investigatorId: "u1" });
    expect(result.allowed).toBe(false);
    expect(result.independent).toBe(false);
  });
});
