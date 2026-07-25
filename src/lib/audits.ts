export const AUDIT_STATUSES = ["DRAFT","IN_PROGRESS","AWAITING_REVIEW","COMPLETED","CLOSED","ARCHIVED"] as const;
export const COMPLIANCE_ANSWERS = ["COMPLIANT","PARTIALLY_COMPLIANT","NON_COMPLIANT","NOT_APPLICABLE"] as const;

export function scoreAnswer(answer: string | null): number | null {
  if (answer === "COMPLIANT" || answer === "YES") return 100;
  if (answer === "PARTIALLY_COMPLIANT") return 50;
  if (answer === "NON_COMPLIANT" || answer === "NO") return 0;
  return null;
}

export function calculateAuditScore(responses: Array<{ score: number | null; weighting: number }>): number | null {
  const scored = responses.filter((item) => item.score !== null);
  if (!scored.length) return null;
  const totalWeight = scored.reduce((sum,item) => sum + Math.max(1,item.weighting),0);
  return Math.round((scored.reduce((sum,item) => sum + (item.score ?? 0) * Math.max(1,item.weighting),0) / totalWeight) * 10) / 10;
}

export function auditStatusLabel(status: string): string {
  return status.replaceAll("_"," ").toLowerCase().replace(/^\w/, (value) => value.toUpperCase());
}

export function auditScopeWhere(context: { organisation:{id:string}; allLocations:boolean; locations:{id:string}[] }) {
  return { organisationId: context.organisation.id, ...(context.allLocations ? {} : { locationId: { in: context.locations.map((item)=>item.id) } }) };
}
