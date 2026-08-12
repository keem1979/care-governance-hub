import type { EvidenceRequirement } from "@/lib/evidence-requirements";

export const INSPECTION_FRAMEWORK_VERSION = "CQC provider framework transition 2026 · ATOM baseline v2";
export const INSPECTION_FRAMEWORK_SOURCE = "https://www.cqc.org.uk/guidance-regulation/providers/assessment/assessment-framework";
export const CQC_EVIDENCE_CATEGORIES = [
  "PEOPLES_EXPERIENCE",
  "STAFF_AND_LEADER_FEEDBACK",
  "PARTNER_FEEDBACK",
  "OBSERVATION",
  "PROCESSES",
  "OUTCOMES",
] as const;

export function expectedCategories(item: EvidenceRequirement): string[] {
  const categories = new Set<string>(["PEOPLES_EXPERIENCE", "STAFF_AND_LEADER_FEEDBACK", "PROCESSES", "OUTCOMES"]);
  if (["SAFE", "EFFECTIVE", "CARING", "RESPONSIVE"].includes(item.keyQuestion)) categories.add("OBSERVATION");
  if (/partner|commission|transition|referral|safeguard|health|professional|continuity/i.test(`${item.key} ${item.title} ${item.description}`)) categories.add("PARTNER_FEEDBACK");
  return [...categories];
}
