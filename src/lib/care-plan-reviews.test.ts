import { describe, expect, it } from "vitest";
import { addRequiredAutomatedActions, parseReviewActions, validateCarePlanReview, type CarePlanReviewPayload } from "@/lib/care-plan-reviews";

const base: CarePlanReviewPayload = {
  workflowStatus: "Draft",
  carePlanReference: "CP-104",
  reviewType: "Scheduled review",
  reviewDueDate: "2026-09-01",
  reasonForReview: "Scheduled review due.",
  mainDecisionRequired: "Does the current plan remain safe and appropriate?",
  currentRisk: "MEDIUM",
  personInvolved: "Yes",
  medicationApplies: "No",
  changesRequired: "No",
  currentPlanSuitableReason: "Current evidence supports the existing arrangements.",
  packageOverall: "Safe and sufficient",
  reviewActions: [],
};

const validate = (payload: CarePlanReviewPayload) => validateCarePlanReview({
  payload, clientId: "client-1", locationId: "location-1", ownerId: "owner-1",
});

describe("Care Plan Review assurance rules", () => {
  it("accepts a complete draft", () => expect(() => validate(base)).not.toThrow());

  it("requires involvement evidence when the person was not fully involved", () => {
    expect(() => validate({ ...base, personInvolved: "No" })).toThrow(/why the person/i);
  });

  it("requires closed-loop control before a Critical review closes", () => {
    expect(() => validate({ ...base, workflowStatus: "Approved / Closed", currentRisk: "CRITICAL" })).toThrow(/Critical review cannot close/i);
  });

  it("requires medication reconciliation after a medication change", () => {
    expect(() => validate({ ...base, medicationApplies: "Yes", medicationChanged: "Yes", medicationChecks: ["Current MAR/eMAR verified"] })).toThrow(/current prescription/i);
  });

  it("requires an accountable action when the package is insufficient", () => {
    expect(() => validate({ ...base, packageOverall: "Insufficient / unsafe" })).toThrow(/management or commissioner action/i);
  });

  it("requires evidence requirements on every review action", () => {
    expect(() => validate({ ...base, reviewActions: [{ priority: "HIGH", finding: "Update plan", ownerId: "owner-1", dueDate: "2026-09-02" }] })).toThrow(/evidence requirement/i);
  });

  it("requires RM judgement and interim controls for Approved With Actions", () => {
    expect(() => validate({ ...base, workflowStatus: "Approved With Actions", rmDecision: "APPROVED WITH ACTIONS" })).toThrow(/rationale/i);
  });

  it("automatically creates accountable actions for assurance triggers", () => {
    const payload = addRequiredAutomatedActions({
      ...base,
      evidenceConflict: "Yes",
      medicationApplies: "Yes",
      medicationDiscrepancy: "Yes",
      packageOverall: "Insufficient / unsafe",
    }, "owner-1", new Date("2026-08-18T09:00:00.000Z"));
    const actions = parseReviewActions(payload.reviewActions);
    expect(actions.map((action) => action.automationKey)).toEqual([
      "resolve-evidence-conflict",
      "medication-discrepancy",
      "care-package-sufficiency",
    ]);
    expect(actions.every((action) => action.ownerId === "owner-1" && Boolean(action.evidenceRequired))).toBe(true);
    expect(actions.find((action) => action.automationKey === "care-package-sufficiency")?.priority).toBe("CRITICAL");
  });
});
