import type { Prisma } from "@/generated/prisma/client";

const REQUIREMENTS_BY_AUDIT: Record<string, string[]> = {
  "governance-audit": ["well-audit-programme", "well-actions"],
  "policy-audit": ["well-policy-control"],
  "staff-file-audit": ["safe-recruitment-files"],
  "recruitment-audit": ["safe-recruitment-files", "safe-dbs", "safe-right-work"],
  "training-audit": ["effective-training-matrix", "effective-induction"],
  "supervision-audit": ["effective-supervision", "effective-appraisals"],
  "care-record-audit": ["effective-care-plans", "safe-risk-assessments"],
  "medicines-audit": ["safe-medicines-policy", "safe-medication-errors"],
  "mar-audit": ["safe-mar"],
  "infection-control-audit": ["safe-infection-control"],
  "health-and-safety-audit": ["safe-equipment", "well-risk-register"],
  "complaints-audit": ["responsive-complaints"],
  "safeguarding-audit": ["safe-safeguarding-log"],
  "incident-audit": ["safe-incidents", "safe-investigations", "safe-duty-candour"],
  "risk-management-audit": ["well-risk-register"],
  "business-continuity-audit": ["well-business-continuity"],
  "cqc-notification-audit": ["safe-cqc-notifications"],
  "service-user-feedback-audit": ["caring-feedback"],
  "staff-engagement-audit": ["well-staff-feedback"],
  "data-protection-audit": ["well-data-protection", "well-access-security", "well-record-retention"],
  "cqc-self-assessment": ["well-audit-programme"],
  "care-call-delivery": ["safe-missed-late-visits", "responsive-preferences"],
  "care-planning-risk": ["effective-care-plans", "safe-risk-assessments"],
  "consent-capacity": ["effective-consent"],
  "staff-competency": ["effective-competency-matrix", "effective-spot-checks"],
  "spot-check": ["effective-spot-checks", "caring-dignity"],
  "nutrition-hydration": ["effective-nutrition"],
  "delegated-healthcare": ["effective-delegated-healthcare"],
  "equality-accessible-information": ["caring-equality", "caring-communication"],
  "commissioner-contract": ["well-kpis", "well-partner-feedback"],
};

export function auditEvidenceRequirementKeys(templateKey: string): string[] {
  return REQUIREMENTS_BY_AUDIT[templateKey] ?? ["well-audit-programme"];
}

export function auditKeyFromEvidenceTags(tags: readonly string[]): string | undefined {
  return tags.find((tag) => tag.startsWith("audit:"))?.slice("audit:".length);
}

export async function syncAuditEvidence(tx: Prisma.TransactionClient, input: {
  auditId: string;
  organisationId: string;
  locationId: string;
  templateKey: string;
  templateName: string;
  templateCategory: string;
  templateVersion: string;
  title: string;
  auditDate: Date;
  reviewDate: Date | null;
  auditorId: string;
  actorId: string;
  score: number | null;
  status: string;
  strengths: string | null;
  risks: string | null;
  recommendations: string | null;
}) {
  const existing = await tx.evidence.findFirst({
    where: { organisationId: input.organisationId, relatedModule: "Audit", relatedRecordId: input.auditId },
    select: { id: true },
  });
  const assuranceActive = ["AWAITING_REVIEW", "COMPLETED", "CLOSED"].includes(input.status);
  if (!existing && !assuranceActive) return null;
  const archived = !assuranceActive;
  const description = [
    `${input.templateName} v${input.templateVersion}.`,
    input.score === null ? "No overall score was calculated." : `Overall assurance score: ${input.score}%.`,
    input.risks ? `Risks and gaps: ${input.risks}` : null,
    input.recommendations ? `Recommendations: ${input.recommendations}` : null,
  ].filter(Boolean).join(" ").slice(0, 2000);
  const data = {
    organisationId: input.organisationId,
    locationId: input.locationId,
    title: `Completed audit: ${input.title}`.slice(0, 180),
    description,
    category: "Audits",
    evidenceType: "Audit assurance record",
    sourceType: "INTERNAL_RECORD" as const,
    sourceName: "Audit Centre",
    ownerId: input.auditorId,
    evidenceDate: input.auditDate,
    reviewExpiryDate: input.reviewDate,
    tags: ["system-generated", "audit", `audit:${input.templateKey}`, `audit-status:${input.status.toLowerCase()}`, ...auditEvidenceRequirementKeys(input.templateKey).map((key) => `requirement:${key}`)],
    relatedModule: "Audit",
    relatedRecordId: input.auditId,
    confidentiality: "CONFIDENTIAL" as const,
    status: archived ? "ARCHIVED" as const : "ACTIVE" as const,
    archivedAt: archived ? new Date() : null,
    notes: "Generated from a submitted audit and kept in sync with the signed governance record. Open the source audit for responses, linked evidence, findings and sign-off.",
  };
  return existing
    ? tx.evidence.update({ where: { id: existing.id }, data })
    : tx.evidence.create({ data: { ...data, uploadedById: input.actorId } });
}
