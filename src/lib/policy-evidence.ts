import type { Prisma } from "@/generated/prisma/client";
import { policyRequirementKeys } from "@/lib/inspection-sync";

export type GeneratedPolicyEvidenceInput = {
  policyId: string;
  organisationId: string;
  title: string;
  category: string;
  ownerId: string;
  actorId: string;
  effectiveDate: Date | null;
  nextReviewDate: Date | null;
  status: string;
  approvalStatus: string;
  templateKey: string;
  templateVersion: string | null;
  complianceAreas: string[];
};

export function generatedPolicyEvidenceData(input: GeneratedPolicyEvidenceInput) {
  const archived = input.status === "ARCHIVED";
  const approved = input.approvalStatus === "APPROVED";
  return {
    organisationId: input.organisationId,
    title: `Policy: ${input.title}`.slice(0, 180),
    description: `${approved ? "Approved" : "Draft"} policy held in the Policy Library. This evidence entry opens the current policy and does not keep a second document.`,
    category: "Policies",
    evidenceType: approved ? "Approved policy" : "Policy record",
    sourceType: "INTERNAL_RECORD" as const,
    sourceName: "Policy Studio",
    sourceReference: input.templateKey,
    ownerId: input.ownerId,
    evidenceDate: input.effectiveDate,
    reviewExpiryDate: input.nextReviewDate,
    tags: [
      "system-generated",
      "policy-studio",
      `policy-template:${input.templateKey}`,
      `policy-status:${input.status.toLowerCase()}`,
      ...policyRequirementKeys(input.templateKey, input.title).map((key) => `requirement:${key}`),
      "evidence-category:processes",
      ...input.complianceAreas.map((value) => value.toLowerCase()),
    ],
    relatedModule: "Policy",
    relatedRecordId: input.policyId,
    generatedPolicyId: input.policyId,
    generatedPolicyTemplateKey: input.templateKey,
    confidentiality: "INTERNAL" as const,
    status: archived ? "ARCHIVED" as const : "ACTIVE" as const,
    archivedAt: archived ? new Date() : null,
    notes: `Evidence Library reference to the current policy. No separate file is stored. Policy Studio edition ${input.templateVersion ?? "organisation authored"}; owner, approval and review details follow the policy record.`,
  };
}

export async function syncGeneratedPolicyEvidence(tx: Prisma.TransactionClient, input: GeneratedPolicyEvidenceInput) {
  const data = generatedPolicyEvidenceData(input);
  return tx.evidence.upsert({
    where: { organisationId_generatedPolicyTemplateKey: { organisationId: input.organisationId, generatedPolicyTemplateKey: input.templateKey } },
    create: { ...data, uploadedById: input.actorId },
    update: data,
  });
}
