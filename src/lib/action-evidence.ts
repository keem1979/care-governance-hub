import type { Prisma } from "@/generated/prisma/client";
import { actionLabel } from "@/lib/actions";

export type ActionEvidenceInput = {
  actionId: string;
  organisationId: string;
  locationId: string | null;
  reference: string;
  title: string;
  description: string;
  category: string;
  sourceType: string;
  sourceReference: string | null;
  ownerId: string;
  actorId: string;
  dueDate: Date;
  reviewDate: Date | null;
  status: string;
  priority: string;
  progressPercent: number;
  expectedOutcome: string | null;
  successMeasure: string | null;
  archived: boolean;
};

export async function syncActionEvidence(tx: Prisma.TransactionClient, input: ActionEvidenceInput) {
  const existing = await tx.evidence.findFirst({ where: { organisationId: input.organisationId, relatedModule: "Action", relatedRecordId: input.actionId }, select: { id: true } });
  const description = [input.description, input.expectedOutcome ? `Expected outcome: ${input.expectedOutcome}` : null, input.successMeasure ? `Success measure: ${input.successMeasure}` : null].filter(Boolean).join("\n\n");
  const data = {
    organisationId: input.organisationId,
    locationId: input.locationId,
    title: `${input.reference} — ${input.title}`.slice(0, 180),
    description,
    category: "Quality improvement",
    evidenceType: "Record",
    ownerId: input.ownerId,
    evidenceDate: new Date(),
    reviewExpiryDate: input.reviewDate ?? input.dueDate,
    tags: ["system-generated", "action-tracker", input.reference.toLowerCase(), input.category.toLowerCase(), input.priority.toLowerCase()],
    relatedModule: "Action",
    relatedRecordId: input.actionId,
    confidentiality: "CONFIDENTIAL" as const,
    status: input.archived ? "ARCHIVED" as const : "ACTIVE" as const,
    archivedAt: input.archived ? new Date() : null,
    notes: `Live Action Tracker record. ${actionLabel(input.status)} · ${input.progressPercent}% complete · ${actionLabel(input.priority)} priority · source ${actionLabel(input.sourceType)}${input.sourceReference ? ` (${input.sourceReference})` : ""}.`,
  };
  return existing ? tx.evidence.update({ where: { id: existing.id }, data }) : tx.evidence.create({ data: { ...data, uploadedById: input.actorId } });
}
