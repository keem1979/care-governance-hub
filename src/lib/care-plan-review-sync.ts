import type { Prisma } from "@/generated/prisma/client";
import { compareCarePlanSnapshots, materialSectionLabels, parseCarePlanSnapshot, reviewToCarePlanSnapshot } from "@/lib/care-plans";
import type { CarePlanReviewPayload } from "@/lib/care-plan-reviews";
import { syncMaterialChangeRecords } from "@/lib/material-changes";

export async function syncCarePlanReviewProposal(tx: Prisma.TransactionClient, input: { organisationId: string; actorId: string; reviewEntryId: string; reviewReference: string; payload: CarePlanReviewPayload }) {
  const carePlanId = String(input.payload.carePlanId ?? "");
  const baseVersionId = String(input.payload.carePlanVersionId ?? "");
  if (!carePlanId || !baseVersionId) return null;
  const plan = await tx.carePlan.findFirst({ where: { id: carePlanId, organisationId: input.organisationId, archivedAt: null } });
  if (!plan || plan.currentVersionId !== baseVersionId) throw new Error("The live care plan changed after this review started. Reopen the latest version before proposing amendments.");
  const baseVersion = await tx.carePlanVersion.findUnique({ where: { id: baseVersionId } });
  if (!baseVersion) throw new Error("The reviewed care-plan version is no longer available.");
  const base = parseCarePlanSnapshot(input.payload.carePlanSnapshot ?? baseVersion.snapshot);
  const proposed = reviewToCarePlanSnapshot(base, { ...input.payload, reference: input.reviewReference });
  const changes = compareCarePlanSnapshots(base, proposed, {
    reason: String(input.payload.reasonForReview ?? "Care-plan review"),
    riskImpact: String(input.payload.currentRisk ?? "LOW") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    source: input.reviewReference,
  });
  if (!changes.length) return { changedSections: [], versionId: null };
  const existing = await tx.carePlanVersion.findFirst({ where: { carePlanId, sourceReviewEntryId: input.reviewEntryId, status: { notIn: ["PUBLISHED", "SUPERSEDED"] } } });
  const status: "AWAITING_APPROVAL" | "DRAFT" = ["APPROVED", "APPROVED WITH ACTIONS"].includes(String(input.payload.rmDecision)) ? "AWAITING_APPROVAL" : "DRAFT";
  const common = {
    status,
    snapshot: proposed as Prisma.InputJsonValue,
    changeSummary: { unchanged: 15 - changes.length, changed: changes.length } as Prisma.InputJsonValue,
    reason: String(input.payload.reasonForReview ?? "Care-plan review"),
    nextReviewDate: date(String(input.payload.nextReviewDate ?? "")),
    materialSections: materialSectionLabels(changes),
    acknowledgementRequired: String(input.payload.readUnderstoodRequired ?? "") === "Yes",
  };
  const maximum = existing ? null : await tx.carePlanVersion.aggregate({ where: { carePlanId }, _max: { versionNumber: true } });
  const version = existing
    ? await tx.carePlanVersion.update({ where: { id: existing.id }, data: common })
    : await tx.carePlanVersion.create({ data: { ...common, carePlanId, versionNumber: (maximum?._max.versionNumber ?? plan.currentVersionNumber) + 1, sourceReviewEntryId: input.reviewEntryId, basedOnVersionId: baseVersionId, createdById: input.actorId } });
  await tx.carePlanChange.deleteMany({ where: { versionId: version.id } });
  await tx.carePlanChange.createMany({
    data: changes.map((change) => ({
      versionId: version.id,
      sectionKey: change.sectionKey,
      fieldPath: change.fieldPath,
      changeType: change.changeType,
      previousValue: (change.previousValue ?? null) as Prisma.InputJsonValue,
      proposedValue: (change.proposedValue ?? null) as Prisma.InputJsonValue,
      reason: change.reason,
      riskImpact: change.riskImpact,
      source: change.source,
      reviewerId: input.actorId,
    })),
  });
  await syncMaterialChangeRecords(tx, {
    organisationId: input.organisationId,
    locationId: plan.locationId,
    carePlanId,
    carePlanVersionId: version.id,
    clientId: plan.clientId,
    actorId: input.actorId,
  });
  if (status === "AWAITING_APPROVAL") await tx.carePlan.update({ where: { id: carePlanId }, data: { status: "AWAITING_APPROVAL" } });
  return { versionId: version.id, changedSections: materialSectionLabels(changes) };
}

function date(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
