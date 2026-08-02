import type { Prisma } from "@/generated/prisma/client";

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
    description: `Live ${approved ? "approved" : "draft"} policy from the ATOM Policy Studio. The Evidence Library links to the controlled policy; it does not store a duplicate document.`,
    category: "Policies",
    evidenceType: approved ? "Approved policy" : "Policy record",
    ownerId: input.ownerId,
    evidenceDate: input.effectiveDate,
    reviewExpiryDate: input.nextReviewDate,
    tags: [
      "system-generated",
      "policy-studio",
      `policy-template:${input.templateKey}`,
      `policy-status:${input.status.toLowerCase()}`,
      ...input.complianceAreas.map((value) => value.toLowerCase()),
    ],
    relatedModule: "Policy",
    relatedRecordId: input.policyId,
    generatedPolicyId: input.policyId,
    generatedPolicyTemplateKey: input.templateKey,
    confidentiality: "INTERNAL" as const,
    status: archived ? "ARCHIVED" as const : "ACTIVE" as const,
    archivedAt: archived ? new Date() : null,
    notes: `One-copy live evidence link. Policy Studio edition ${input.templateVersion ?? "organisation authored"}; changes, approval and review dates stay synchronised from the source policy.`,
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
