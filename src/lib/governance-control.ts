import type { EvidenceAssuranceState } from "@/lib/evidence-assurance";

export const DECISION_IMPACTS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export const OBLIGATION_TYPES = ["COMMISSIONER_RETURN", "REGULATORY_NOTIFICATION", "CONTRACT_REVIEW", "INFORMATION_REQUEST", "OTHER"] as const;
export const OBLIGATION_STATUSES = ["OPEN", "PREPARING", "SUBMITTED", "QUERY_RECEIVED", "ACCEPTED", "CLOSED", "CANCELLED"] as const;
export const OBLIGATION_UPDATE_TYPES = ["NOTE", "CHASE", "SUBMISSION", "QUERY", "RESPONSE", "ACCEPTANCE", "CLOSURE", "ESCALATION"] as const;

export function governanceLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function decisionImplementationGate(input: {
  impact: string;
  evidenceId: string | null;
  evidenceState: EvidenceAssuranceState | null;
}) {
  if (!["HIGH", "CRITICAL"].includes(input.impact)) return { allowed: true, reason: null };
  if (!input.evidenceId) return { allowed: false, reason: "High and critical decisions require implementation evidence." };
  if (input.evidenceState !== "CURRENT_VERIFIED") return { allowed: false, reason: "High and critical decisions require current verified evidence." };
  return { allowed: true, reason: null };
}

export function independentDecisionReview(input: { ownerId: string; implementedById: string | null; reviewerId: string }) {
  return input.reviewerId !== input.ownerId && input.reviewerId !== input.implementedById;
}

export function obligationIsOverdue(input: { status: string; dueAt: Date }, now = new Date()) {
  return !["ACCEPTED", "CLOSED", "CANCELLED"].includes(input.status) && input.dueAt < now;
}

export function dependencyIsOverdue(input: { status: string; dueDate: Date }, now = new Date()) {
  return !["RESOLVED", "CANCELLED"].includes(input.status) && input.dueDate < now;
}

export function obligationTransitionAllowed(current: string, next: string) {
  const allowed: Record<string, string[]> = {
    OPEN: ["PREPARING", "SUBMITTED", "CANCELLED"],
    PREPARING: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["QUERY_RECEIVED", "ACCEPTED"],
    QUERY_RECEIVED: ["PREPARING", "SUBMITTED"],
    ACCEPTED: ["CLOSED"],
    CLOSED: [],
    CANCELLED: [],
  };
  return allowed[current]?.includes(next) ?? false;
}
