import { describe, expect, it } from "vitest";
import { decisionImplementationGate, independentDecisionReview, obligationIsOverdue, obligationTransitionAllowed } from "@/lib/governance-control";

describe("governance control", () => {
  it("requires current verified evidence for high-impact implementation", () => {
    expect(decisionImplementationGate({ impact: "HIGH", evidenceId: null, evidenceState: null }).allowed).toBe(false);
    expect(decisionImplementationGate({ impact: "CRITICAL", evidenceId: "e1", evidenceState: "UNVERIFIED" }).allowed).toBe(false);
    expect(decisionImplementationGate({ impact: "HIGH", evidenceId: "e1", evidenceState: "CURRENT_VERIFIED" }).allowed).toBe(true);
  });

  it("requires an independent reviewer", () => {
    expect(independentDecisionReview({ ownerId: "u1", implementedById: "u2", reviewerId: "u2" })).toBe(false);
    expect(independentDecisionReview({ ownerId: "u1", implementedById: "u2", reviewerId: "u3" })).toBe(true);
  });

  it("keeps overdue external work visible until accepted, closed or cancelled", () => {
    const dueAt = new Date("2026-01-01T00:00:00Z"), now = new Date("2026-02-01T00:00:00Z");
    expect(obligationIsOverdue({ status: "SUBMITTED", dueAt }, now)).toBe(true);
    expect(obligationIsOverdue({ status: "CLOSED", dueAt }, now)).toBe(false);
  });

  it("prevents closing an obligation before acceptance", () => {
    expect(obligationTransitionAllowed("SUBMITTED", "CLOSED")).toBe(false);
    expect(obligationTransitionAllowed("ACCEPTED", "CLOSED")).toBe(true);
  });
});
