export const ASSURANCE_STATUSES = ["NOT_READY", "NEEDS_REVIEW", "PARTIALLY_ASSURED", "ASSURED", "NOT_APPLICABLE"] as const;
export type AssuranceStatus = (typeof ASSURANCE_STATUSES)[number];

export type InspectionAssuranceInput = {
  reviewDate: Date | null;
  expectedCategories: readonly string[];
  coveredCategories: readonly string[];
  currentEvidence: number;
  expiredEvidence: number;
  activeAudits: number;
  unresolvedFindings: number;
  activeRegisters: number;
  openActions: number;
  overdueActions: number;
  liveSignals: number;
  adverseSignals: number;
  managementDecision: string;
  reviewedAt: Date | null;
  signedOffAt: Date | null;
  now?: Date;
};

export type InspectionAssurance = {
  score: number;
  status: AssuranceStatus;
  currentRecords: number;
  categoryCoverage: number;
  blockers: string[];
  warnings: string[];
};

export function calculateInspectionAssurance(input: InspectionAssuranceInput): InspectionAssurance {
  const now = input.now ?? new Date();
  if (input.managementDecision === "NOT_APPLICABLE") return { score: 100, status: "NOT_APPLICABLE", currentRecords: 0, categoryCoverage: 100, blockers: [], warnings: [] };
  const currentRecords = input.currentEvidence + input.activeAudits + input.activeRegisters + input.liveSignals;
  const covered = new Set(input.coveredCategories);
  const expected = [...new Set(input.expectedCategories)];
  const categoryCoverage = expected.length ? Math.round((expected.filter((item) => covered.has(item)).length / expected.length) * 100) : 100;
  const blockers: string[] = [], warnings: string[] = [];
  if (!currentRecords) blockers.push("No current supporting records");
  if (input.expiredEvidence) blockers.push(`${input.expiredEvidence} expired evidence item${input.expiredEvidence === 1 ? "" : "s"}`);
  if (input.overdueActions) blockers.push(`${input.overdueActions} overdue improvement action${input.overdueActions === 1 ? "" : "s"}`);
  if (input.unresolvedFindings) blockers.push(`${input.unresolvedFindings} unresolved audit finding${input.unresolvedFindings === 1 ? "" : "s"}`);
  if (input.adverseSignals) blockers.push(`${input.adverseSignals} adverse live signal${input.adverseSignals === 1 ? "" : "s"}`);
  if (input.reviewDate && input.reviewDate < now) blockers.push("RM review is overdue");
  if (categoryCoverage < 100) warnings.push(`${100 - categoryCoverage}% of expected CQC evidence categories are not covered`);
  if (!input.reviewedAt || input.managementDecision === "NOT_REVIEWED") warnings.push("RM judgement has not been recorded");
  if (!input.signedOffAt) warnings.push("RM assurance has not been signed off");
  if (input.openActions) warnings.push(`${input.openActions} open improvement action${input.openActions === 1 ? "" : "s"}`);

  let score = 0;
  if (currentRecords) score += 25;
  score += Math.round(categoryCoverage * 0.25);
  if (input.reviewedAt && input.managementDecision !== "NOT_REVIEWED") score += 20;
  if (input.signedOffAt) score += 15;
  if (!blockers.length) score += 15;
  score = Math.max(0, Math.min(100, score - Math.min(30, input.expiredEvidence * 5 + input.overdueActions * 5 + input.unresolvedFindings * 5 + input.adverseSignals * 5)));
  const status: AssuranceStatus = blockers.length || input.managementDecision === "NOT_ASSURED"
    ? "NOT_READY"
    : input.managementDecision === "ASSURED" && input.signedOffAt && categoryCoverage === 100
      ? "ASSURED"
      : input.reviewedAt
        ? "PARTIALLY_ASSURED"
        : "NEEDS_REVIEW";
  return { score, status, currentRecords, categoryCoverage, blockers, warnings };
}

export function assuranceLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
