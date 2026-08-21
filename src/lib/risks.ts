export const RISK_STATUSES = ["OPEN", "MONITORING", "TREATMENT_IN_PROGRESS", "ACCEPTED", "CLOSED", "ARCHIVED"] as const;
export const RISK_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export const RISK_CATEGORIES = ["Care quality", "Clinical", "Safeguarding", "Medicines", "Workforce", "Operational", "Business continuity", "Financial", "Information governance", "Cyber security", "Health and safety", "Compliance", "Commissioner contract", "Reputational", "Strategic", "Other"] as const;
export const REVIEW_FREQUENCIES = ["Weekly", "Monthly", "Quarterly", "Six-monthly", "Annually"] as const;
export const RISK_SOURCES = ["Incident or near miss", "Audit finding", "Complaint or feedback", "Safeguarding concern", "Staff concern", "KPI or data trend", "Inspection or commissioner", "Change assessment", "Business continuity exercise", "Manual identification", "Other"] as const;
export const CONTROL_EFFECTIVENESS = ["NOT_TESTED", "INEFFECTIVE", "PARTIALLY_EFFECTIVE", "EFFECTIVE"] as const;
export const TREATMENT_STRATEGIES = ["AVOID", "REDUCE", "TRANSFER_OR_SHARE", "ACCEPT"] as const;
export const RISK_APPETITES = ["ZERO_TOLERANCE", "LOW", "MODERATE", "OPEN"] as const;
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
  if(frequency==="Weekly")result.setUTCDate(result.getUTCDate()+7);
  else {const months = frequency === "Monthly" ? 1 : frequency === "Quarterly" ? 3 : frequency === "Six-monthly" ? 6 : 12;result.setUTCMonth(result.getUTCMonth() + months);}
  return result;
}

export function isOutsideTolerance(score:number,tolerance:number|null|undefined){return Number.isInteger(tolerance)&&Number(tolerance)>0&&score>Number(tolerance)}

export function riskNeedsEscalation(score:number,tolerance:number|null|undefined){return riskLevel(score)==="CRITICAL"||isOutsideTolerance(score,tolerance)}

export function validateRiskPlan(input:{residualScore:number;targetScore:number;toleranceScore:number;ownerId?:string|null;treatmentStrategy:string;acceptanceRationale?:string|null}){
  if(input.targetScore>input.residualScore&&input.treatmentStrategy!=="ACCEPT")throw new Error("The target risk score cannot be higher than the current score unless the risk is being accepted with a clear rationale.");
  if(riskLevel(input.residualScore)==="CRITICAL"&&!input.ownerId)throw new Error("Critical risks require a named owner.");
  if(input.treatmentStrategy==="ACCEPT"&&!input.acceptanceRationale?.trim())throw new Error("Explain why the remaining risk is acceptable and who authorised that decision.");
  if(input.toleranceScore<1||input.toleranceScore>25)throw new Error("The tolerance threshold must be between 1 and 25.");
}

export function validateRiskClosure(input: { status: string; level: string; residualScore?: number; toleranceScore?: number | null; rationale?: string; ownerId?: string | null; approverId?: string; actorId?: string; closureDate?: Date | null; supportingEvidenceCount?: number; verifiedCurrentEvidenceCount?: number; unresolvedActionCount?: number }) {
  if (input.status !== "CLOSED") return;
  if (!input.rationale?.trim()) throw new Error("Enter a closure rationale before closing this risk.");
  if (input.approverId && input.actorId && input.approverId !== input.actorId) throw new Error("Risk closure approval must be recorded by the signed-in approver; another person's approval cannot be selected on their behalf.");
  if (["HIGH", "CRITICAL"].includes(input.level) && !input.approverId) throw new Error("High and critical risks require named closure approval.");
  if (["HIGH", "CRITICAL"].includes(input.level) && !input.closureDate) throw new Error("High and critical risks require a closure date.");
  if ((input.supportingEvidenceCount ?? 0) < 1) throw new Error("Link sufficient appropriate supporting evidence before closing this risk; the live risk record alone is not closure evidence.");
  if (["HIGH", "CRITICAL"].includes(input.level) && (input.verifiedCurrentEvidenceCount ?? 0) < 1) throw new Error("High and critical Risk closure requires current verified evidence of treatment and effectiveness.");
  if (["HIGH", "CRITICAL"].includes(input.level) && input.ownerId && input.approverId === input.ownerId) throw new Error("High and critical Risk closure cannot be self-approved by the Risk owner.");
  if ((input.unresolvedActionCount ?? 0) > 0) throw new Error("Resolve, transfer or formally account for linked treatment actions before closing this risk.");
  if (typeof input.residualScore === "number" && typeof input.toleranceScore === "number" && input.residualScore > input.toleranceScore) throw new Error("Complete a formal risk review before closure: the current residual risk remains outside the recorded tolerance.");
}

export function levelClasses(level: string): string {
  if (level === "CRITICAL") return "bg-red-700 text-white";
  if (level === "HIGH") return "bg-orange-100 text-orange-900";
  if (level === "MODERATE") return "bg-amber-100 text-amber-900";
  return "bg-emerald-100 text-emerald-900";
}
