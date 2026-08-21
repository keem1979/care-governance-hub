import { ACTION_CATEGORIES } from "@/lib/actions";

type RiskForAction = {
  reference: string;
  title: string;
  category: string;
  furtherControls: string | null;
  locationId: string | null;
  ownerId: string | null;
  targetDate: Date | null;
  residualLevel: string;
  residualScore: number;
  targetScore: number | null;
  controlAssurance: string | null;
};

export function riskActionPrefill(risk: RiskForAction, fallbackOwnerId: string, oversightOwnerIds: Set<string>) {
  const ownerId = risk.ownerId ?? fallbackOwnerId;
  const oversightOwnerId = oversightOwnerIds.has(ownerId)
    ? ownerId
    : oversightOwnerIds.has(fallbackOwnerId)
      ? fallbackOwnerId
      : "";
  const treatment = risk.furtherControls?.trim() || `Define and implement the agreed treatment for ${risk.reference} — ${risk.title}.`;
  const target = risk.targetScore ?? risk.residualScore;
  return {
    title: treatmentTitle(treatment, risk.title),
    description: treatment,
    category: actionCategory(risk.category),
    expectedOutcome: `The agreed treatment is implemented and ${risk.reference} is ready for formal reassessment. The target score of ${target} is an expected future position, not an automatically achieved result.`,
    successMeasure: `Completion evidence is linked and verified; effectiveness is assessed against ${risk.controlAssurance?.trim() || "the recorded control objective"}; a formal Risk review records whether the residual score should change.`,
    locationId: risk.locationId ?? "",
    ownerId,
    oversightOwnerId,
    priority: risk.residualLevel === "MODERATE" ? "MEDIUM" : risk.residualLevel,
    dueDate: inputDate(risk.targetDate) || future(30),
    reviewDate: reviewDate(risk.targetDate),
  };
}

function treatmentTitle(treatment: string, riskTitle: string) {
  const first = treatment.split(/\r?\n/).map((line) => line.replace(/^[•*-]\s*/, "").trim()).find(Boolean);
  const value = first || `Implement treatment for ${riskTitle}`;
  return value.length <= 180 ? value : `Implement treatment for ${riskTitle}`.slice(0, 180);
}

function actionCategory(category: string) {
  const mapped: Record<string, string> = {
    "Care quality": "Care quality",
    Clinical: "Care planning and reviews",
    Safeguarding: "Safeguarding",
    Medicines: "Medicines",
    Workforce: "Workforce",
    "Business continuity": "Business continuity",
    "Information governance": "Information governance and data protection",
    "Cyber security": "Information governance and data protection",
    "Health and safety": "Health and safety",
    Compliance: "Governance and regulatory duties",
    "Commissioner contract": "Commissioner and contractual requirements",
  };
  const value = mapped[category] ?? "Risk management";
  return ACTION_CATEGORIES.includes(value as never) ? value : "Risk management";
}

function inputDate(value: Date | null) { return value?.toISOString().slice(0, 10) ?? ""; }
function future(days: number) { const value = new Date(); value.setUTCDate(value.getUTCDate() + days); return inputDate(value); }
function reviewDate(targetDate: Date | null) {
  if (!targetDate) return future(14);
  const value = new Date(targetDate);
  value.setUTCDate(value.getUTCDate() - 7);
  return inputDate(value < new Date() ? new Date() : value);
}
