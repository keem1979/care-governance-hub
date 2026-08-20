export const INTEGRATION_SCOPES = ["events:write"] as const;
export const INTEGRATION_DIRECTIONS = ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"] as const;
export const IMPORT_TARGETS = ["CLIENT", "STAFF_MEMBER"] as const;
export const OFFLINE_CAPTURE_TYPES = ["OBSERVATION", "ACTION_EVIDENCE", "RISK_EVIDENCE", "POLICY_EVIDENCE", "OTHER"] as const;
export const CANONICAL_ENTITY_TYPES = ["CLIENT", "STAFF_MEMBER", "SERVICE_LOCATION", "EXTERNAL_PARTY"] as const;

export type IntegrationGates = {
  gateBusinessNeed: boolean;
  gateDataProtection: boolean;
  gateSupplierAssurance: boolean;
  gateSecurityDesign: boolean;
  gateTechnicalMapping: boolean;
  gateSafeTesting: boolean;
  gateOperations: boolean;
  gateApproval: boolean;
};

export function allIntegrationGatesPassed(input: IntegrationGates) {
  return Object.values(input).every(Boolean);
}

export function connectionCanActivate(input: IntegrationGates & { reviewDueAt: Date; ownerId: string }, now = new Date()) {
  if (!input.ownerId) return { allowed: false, reason: "A named integration owner is required." };
  if (!allIntegrationGatesPassed(input)) return { allowed: false, reason: "All eight approval gates must be evidenced before activation." };
  if (input.reviewDueAt <= now) return { allowed: false, reason: "The integration review date must be in the future." };
  return { allowed: true, reason: null };
}

export function classifyImportRow(input: { target: string; externalId: string; firstName: string; lastName: string; jobTitle?: string; exactMatch: boolean; candidates: string[] }) {
  const messages: string[] = [];
  if (!input.externalId.trim()) messages.push("External ID is required.");
  if (!input.firstName.trim()) messages.push("First name is required.");
  if (!input.lastName.trim()) messages.push("Last name is required.");
  if (input.target === "STAFF_MEMBER" && !input.jobTitle?.trim()) messages.push("Job title is required for staff imports.");
  if (messages.length) return { status: "INVALID" as const, messages };
  if (input.exactMatch) return { status: "EXACT_MATCH" as const, messages: ["Existing external identifier found; canonical data will not be overwritten."] };
  if (input.candidates.length) return { status: "POTENTIAL_MATCH" as const, messages: ["Potential identity match requires human reconciliation."] };
  return { status: "READY_TO_CREATE" as const, messages: ["No match found; ready for authorised creation."] };
}

export function importBatchStatus(counts: { ready: number; conflicts: number; invalid: number; applied: number; total: number }) {
  if (counts.applied === counts.total && counts.total > 0) return "COMPLETED" as const;
  if (counts.applied > 0) return "PARTIALLY_APPLIED" as const;
  if (counts.conflicts > 0) return "AWAITING_RECONCILIATION" as const;
  if (counts.ready > 0 && counts.invalid === 0) return "READY_TO_APPLY" as const;
  return "ANALYSED" as const;
}

export function offlineCaptureConflict(input: { baseUpdatedAt: Date | null; sourceUpdatedAt: Date | null }) {
  if (!input.baseUpdatedAt || !input.sourceUpdatedAt) return null;
  return input.sourceUpdatedAt > input.baseUpdatedAt ? "The linked source changed after this offline note was started. Review both versions before accepting it." : null;
}

export function integrationLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export async function hashIntegrationToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateIntegrationToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `qcgms_live_${value}`;
}
