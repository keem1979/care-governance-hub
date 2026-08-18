export const UNDERSTANDING_OUTCOMES = ["SATISFACTORY", "SUPPORT_REQUIRED", "OBSERVATION_REQUIRED"] as const;

export type CompetencyMatchState = "CURRENT" | "EXPIRING_SOON" | "EXPIRED" | "NOT_VERIFIED" | "NOT_RECORDED";

export function isCriticalCareChange(input: { overallRisk: string; materialSections: readonly string[]; materialSeverities?: readonly string[] }): boolean {
  if (input.overallRisk === "CRITICAL" || input.materialSeverities?.includes("CRITICAL")) return true;
  return input.materialSections.some((section) => /medication|deterioration|risk|safeguarding|capacity|moving|feeding|insulin/i.test(section));
}

export function understandingPrompt(reference: string, versionNumber: number, materialSections: readonly string[]): string {
  const changed = materialSections.length ? materialSections.join(", ") : "the current care instructions";
  return `For ${reference} version ${versionNumber}, explain the instruction you must follow for ${changed}, what you must not do, and when you must escalate or seek help.`;
}

export function competencyMatchState(record: { outcome: string; verifiedAt: Date | null; expiryDate: Date | null } | undefined, now = new Date()): CompetencyMatchState {
  if (!record) return "NOT_RECORDED";
  if (!record.verifiedAt || !["VALID", "PASSED", "COMPLETE"].includes(record.outcome)) return "NOT_VERIFIED";
  if (record.expiryDate && record.expiryDate < now) return "EXPIRED";
  if (record.expiryDate && record.expiryDate.getTime() <= now.getTime() + 30 * 86_400_000) return "EXPIRING_SOON";
  return "CURRENT";
}

export function assuranceLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
