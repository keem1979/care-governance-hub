import type { Prisma } from "@/generated/prisma/client";

export type RegisterEvidenceInput = {
  entryId: string;
  organisationId: string;
  locationId: string | null;
  definitionKey: string;
  definitionName: string;
  reference: string;
  title: string;
  summary: string;
  eventDate: Date;
  ownerId: string | null;
  actorId: string;
  archived: boolean;
};

const CATEGORY_BY_REGISTER: Record<string, string> = {
  complaints: "Complaints",
  compliments: "Service-user feedback",
  incidents: "Incidents",
  accidents: "Incidents",
  "near-misses": "Incidents",
  safeguarding: "Safeguarding",
  "cqc-notifications": "CQC notifications",
  "medicines-errors": "Medicines",
  falls: "Incidents",
  "pressure-damage": "Incidents",
  "data-breaches": "Incidents",
  "service-user-feedback": "Service-user feedback",
  "staff-feedback": "Staff feedback",
  "training-exceptions": "Training",
  "supervision-exceptions": "Supervision",
  "business-continuity": "Business continuity",
  "care-plan-reviews": "Audits",
  "risk-assessment-reviews": "Audits",
  "mar-audits": "Medicines",
  "delegated-healthcare": "Competencies",
  "service-user-outcomes": "Quality improvement",
  "satisfaction-surveys": "Service-user feedback",
  "commissioner-contracts": "Quality improvement",
  "call-log": "Other",
};

const REQUIREMENT_BY_REGISTER: Record<string, string> = {
  complaints: "responsive-complaints",
  compliments: "caring-compliments",
  incidents: "safe-incidents",
  accidents: "safe-incidents",
  "near-misses": "safe-incidents",
  safeguarding: "safe-safeguarding-log",
  "cqc-notifications": "safe-cqc-notifications",
  "medicines-errors": "safe-medication-errors",
  "missed-visits": "safe-missed-late-visits",
  "late-visits": "safe-missed-late-visits",
  "hospital-admissions": "effective-transitions",
  "service-user-feedback": "caring-feedback",
  "staff-feedback": "well-staff-feedback",
  "data-breaches": "well-data-breaches",
  "business-continuity": "well-business-continuity",
  "care-plan-reviews": "effective-care-plans",
  "risk-assessment-reviews": "safe-risk-assessments",
  "mar-audits": "safe-mar",
  "delegated-healthcare": "effective-delegated-healthcare",
  "service-user-outcomes": "effective-outcomes",
  "satisfaction-surveys": "caring-feedback",
  "commissioner-contracts": "well-partner-feedback",
  "call-log": "responsive-call-log",
};

export function registerEvidenceCategory(key: string): string {
  return CATEGORY_BY_REGISTER[key] ?? "Other";
}

export function registerEvidenceRequirementKey(key: string): string | undefined {
  return REQUIREMENT_BY_REGISTER[key];
}

export function registerKeyFromEvidenceTags(tags: readonly string[]): string | undefined {
  return tags.find((tag) => tag.startsWith("register:"))?.slice("register:".length);
}

export async function syncRegisterEvidence(tx: Prisma.TransactionClient, input: RegisterEvidenceInput) {
  const existing = await tx.evidence.findFirst({
    where: {
      organisationId: input.organisationId,
      relatedModule: "RegisterEntry",
      relatedRecordId: input.entryId,
    },
    select: { id: true },
  });
  const data = {
    organisationId: input.organisationId,
    locationId: input.locationId,
    title: `${input.definitionName}: ${input.reference} — ${input.title}`.slice(0, 180),
    description: input.summary,
    category: registerEvidenceCategory(input.definitionKey),
    evidenceType: "Record",
    ownerId: input.ownerId ?? input.actorId,
    evidenceDate: input.eventDate,
    tags: ["system-generated", "register", `register:${input.definitionKey}`, input.reference.toLowerCase()],
    relatedModule: "RegisterEntry",
    relatedRecordId: input.entryId,
    confidentiality: "CONFIDENTIAL" as const,
    status: input.archived ? "ARCHIVED" as const : "ACTIVE" as const,
    archivedAt: input.archived ? new Date() : null,
    notes: `Kept in sync automatically with the ${input.definitionName} register. Open the source record for its full history and supporting documents.`,
  };
  const evidence = existing
    ? await tx.evidence.update({ where: { id: existing.id }, data })
    : await tx.evidence.create({ data: { ...data, uploadedById: input.actorId } });
  await tx.registerEntryEvidence.upsert({
    where: { entryId_evidenceId: { entryId: input.entryId, evidenceId: evidence.id } },
    create: { entryId: input.entryId, evidenceId: evidence.id },
    update: {},
  });
  return evidence;
}
