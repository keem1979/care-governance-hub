import type { Prisma } from "@/generated/prisma/client";
import { trainingMatrixState } from "@/lib/workforce";

export async function syncTrainingMatrixEvidence(tx: Prisma.TransactionClient, input: { organisationId: string; actorId: string }) {
  const requirements = await tx.staffTrainingRequirement.findMany({
    where: { organisationId: input.organisationId, archivedAt: null, staffMember: { archivedAt: null } },
    include: { staffMember: { select: { records: { where: { type: { in: ["TRAINING", "COMPETENCY"] } }, orderBy: { completedDate: "desc" } } } }, trainingCourse: { select: { id: true } } },
  });
  const states = requirements.map((requirement) => {
    const record = requirement.staffMember.records.find((item) => item.trainingCourseId === requirement.trainingCourse.id);
    return trainingMatrixState({ exempt: requirement.exempt, requiredBy: requirement.requiredBy, expiryDate: record?.expiryDate, outcome: record?.outcome });
  });
  const current = states.filter((state) => state === "CURRENT" || state === "NOT_REQUIRED").length;
  const attention = states.length - current;
  const description = `${requirements.length} assigned training requirements across the workforce: ${current} current or not required; ${attention} missing, due, expired or needing development.`;
  const existing = await tx.evidence.findFirst({ where: { organisationId: input.organisationId, relatedModule: "WorkforceTrainingMatrix" }, select: { id: true } });
  const data = { title: "Workforce training and competency matrix", description, category: "Training", evidenceType: "Record", sourceType: "SYSTEM_GENERATED" as const, sourceName: "Workforce training matrix", sourceReference: "current", ownerId: input.actorId, evidenceDate: new Date(), tags: ["system-generated", "workforce", "training-matrix", "regulation-18", "requirement:effective-training-matrix", "requirement:effective-competency-matrix", "evidence-category:staff-and-leader-feedback", "evidence-category:outcomes"], relatedModule: "WorkforceTrainingMatrix", relatedRecordId: "current", confidentiality: "RESTRICTED" as const, status: "ACTIVE" as const, notes: "Automatically refreshed from role assignments and dated staff training or competency records. Open Workforce → Training matrix for the live source." };
  return existing ? tx.evidence.update({ where: { id: existing.id }, data }) : tx.evidence.create({ data: { ...data, organisationId: input.organisationId, uploadedById: input.actorId } });
}
