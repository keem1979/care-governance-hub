import type { Prisma } from "@/generated/prisma/client";
import type { AuthorisedContext } from "@/lib/auth/dal";
import { centralActionData, parseReviewActions } from "@/lib/care-plan-reviews";
import { clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";

export async function validateCarePlanReviewLinks(
  db: ReturnType<typeof createDb>,
  context: AuthorisedContext,
  input: { clientId: string | null; locationId: string | null; ownerId: string | null; evidenceIds: string[]; actions: ReturnType<typeof parseReviewActions> },
) {
  if (input.locationId && !context.locations.some(({ id }) => id === input.locationId)) throw new Error("Choose an authorised service location.");
  if (input.clientId && !(await db.client.findFirst({ where: { id: input.clientId, ...clientScopeWhere(context) }, select: { id: true } }))) throw new Error("Choose an authorised person record.");
  const ownerIds = [...new Set([input.ownerId, ...input.actions.map((action) => action.ownerId)].filter(Boolean) as string[])];
  if (ownerIds.length) {
    const count = await db.organisationMembership.count({ where: { organisationId: context.organisation.id, userId: { in: ownerIds }, status: "ACTIVE" } });
    if (count !== ownerIds.length) throw new Error("Choose active organisation members for the reviewer and action owners.");
  }
  const evidenceIds = [...new Set(input.evidenceIds)];
  if (evidenceIds.length) {
    const count = await db.evidence.count({ where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context) } });
    if (count !== evidenceIds.length) throw new Error("One or more linked evidence records are not authorised.");
  }
}

export async function createCarePlanReviewActions(
  tx: Prisma.TransactionClient,
  actions: ReturnType<typeof parseReviewActions>,
  review: { organisationId: string; locationId: string | null; clientId: string | null; entryId: string; reviewReference: string; actorId: string },
) {
  const saved: ReturnType<typeof parseReviewActions> = [];
  const linkedActionIds: string[] = [];
  for (const action of actions) {
    if (action.actionId) { saved.push(action); linkedActionIds.push(action.actionId); continue; }
    const created = await tx.action.create({ data: centralActionData(action, review) });
    await tx.actionUpdate.create({ data: { actionId: created.id, userId: review.actorId, note: `Created from care-plan review ${review.reviewReference}.`, status: "OPEN", progressPercent: 0 } });
    saved.push({ ...action, actionId: created.id }); linkedActionIds.push(created.id);
  }
  return { actions: saved, linkedActionIds };
}
