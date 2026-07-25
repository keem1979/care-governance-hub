export const RISK_STATUSES = ["OPEN", "MONITORING", "TREATMENT_IN_PROGRESS", "ACCEPTED", "CLOSED", "ARCHIVED"] as const;
export const RISK_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export const RISK_CATEGORIES = ["Clinical", "Safeguarding", "Workforce", "Operational", "Financial", "Information governance", "Health and safety", "Compliance", "Reputational", "Other"] as const;
export const REVIEW_FREQUENCIES = ["Monthly", "Quarterly", "Six-monthly", "Annually"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export function riskScore(likelihood: number, impact: number): number {
  if (![likelihood, impact].every((value) => Number.isInteger(value) && value >= 1 && value <= 5)) throw new Error("Likelihood and impact must be whole numbers from 1 to 5.");
  return likelihood * impact;
}

export function riskLevel(score: number): RiskLevel {
  if (score <= 4) return "LOW";
  if (score <= 9) return "MODERATE";
  if (score <= 16) return "HIGH";
  return "CRITICAL";
}

export function riskStatusLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function makeRiskReference(now = new Date(), random = Math.floor(Math.random() * 1000)): string {
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `RSK-${date}-${String(random).padStart(3, "0")}`;
}

export function riskScopeWhere(context: { organisation: { id: string }; allLocations: boolean; locations: { id: string }[] }) {
  return {
    organisationId: context.organisation.id,
    ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id }) => id) } }] }),
  };
}

export function addReviewFrequency(date: Date, frequency: string): Date {
  const result = new Date(date);
  const months = frequency === "Monthly" ? 1 : frequency === "Quarterly" ? 3 : frequency === "Six-monthly" ? 6 : 12;
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function validateRiskClosure(input: { status: string; level: string; rationale?: string; approverId?: string; closureDate?: Date | null }) {
  if (input.status !== "CLOSED") return;
  if (!input.rationale?.trim()) throw new Error("Enter a closure rationale before closing this risk.");
  if (["HIGH", "CRITICAL"].includes(input.level) && !input.approverId) throw new Error("High and critical risks require named closure approval.");
  if (["HIGH", "CRITICAL"].includes(input.level) && !input.closureDate) throw new Error("High and critical risks require a closure date.");
}

export function levelClasses(level: string): string {
  if (level === "CRITICAL") return "bg-red-700 text-white";
  if (level === "HIGH") return "bg-orange-100 text-orange-900";
  if (level === "MODERATE") return "bg-amber-100 text-amber-900";
  return "bg-emerald-100 text-emerald-900";
}
