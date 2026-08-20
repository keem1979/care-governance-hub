export const EVIDENCE_SOURCE_TYPES = ["INTERNAL_RECORD", "UPLOADED_DOCUMENT", "EXTERNAL_DOCUMENT", "SYSTEM_GENERATED", "OBSERVATION", "FEEDBACK", "DATASET", "OTHER"] as const;
export const EVIDENCE_VERIFICATION_OUTCOMES = ["VERIFIED", "VERIFIED_WITH_LIMITATIONS", "REJECTED"] as const;
export const EVIDENCE_MAPPING_DECISIONS = ["PENDING", "SUITABLE", "PARTIALLY_SUITABLE", "NOT_SUITABLE"] as const;

export type EvidenceAssuranceState = "CURRENT_VERIFIED" | "VERIFIED_WITH_LIMITATIONS" | "EXPIRING_SOON" | "EXPIRED" | "STALE_VERIFICATION" | "REJECTED" | "UNVERIFIED" | "ARCHIVED";

export function evidenceAssuranceState(input: {
  status: string;
  reviewExpiryDate: Date | null;
  updatedAt: Date;
  currentVersionId: string | null;
  verification?: { outcome: string; verifiedAt: Date; evidenceVersionId: string | null; reviewDueAt: Date | null };
}, now = new Date()): EvidenceAssuranceState {
  if (input.status !== "ACTIVE") return "ARCHIVED";
  if (input.reviewExpiryDate && input.reviewExpiryDate < now) return "EXPIRED";
  const verification = input.verification;
  if (!verification) return "UNVERIFIED";
  if (verification.outcome === "REJECTED") return "REJECTED";
  if (input.currentVersionId ? verification.evidenceVersionId !== input.currentVersionId : verification.verifiedAt < input.updatedAt) return "STALE_VERIFICATION";
  const reviewDate = earliest(input.reviewExpiryDate, verification.reviewDueAt);
  if (reviewDate && reviewDate < now) return "EXPIRED";
  if (reviewDate && reviewDate.getTime() <= now.getTime() + 30 * 86_400_000) return "EXPIRING_SOON";
  return verification.outcome === "VERIFIED_WITH_LIMITATIONS" ? "VERIFIED_WITH_LIMITATIONS" : "CURRENT_VERIFIED";
}

export function mappingSupportsClaim(decision: string, state: EvidenceAssuranceState): "FULL" | "PARTIAL" | "NONE" {
  if (decision === "SUITABLE" && state === "CURRENT_VERIFIED") return "FULL";
  if (["SUITABLE", "PARTIALLY_SUITABLE"].includes(decision) && ["CURRENT_VERIFIED", "VERIFIED_WITH_LIMITATIONS", "EXPIRING_SOON"].includes(state)) return "PARTIAL";
  return "NONE";
}

export function evidenceAssuranceLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function earliest(a: Date | null, b: Date | null) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}
