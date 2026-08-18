import type { Prisma } from "@/generated/prisma/client";
import { makeActionReference } from "@/lib/actions";
import type { CarePlanSnapshot } from "@/lib/care-plans";

export async function ensureCarePlanActions(tx: Prisma.TransactionClient, input: {
  carePlanId: string; organisationId: string; locationId: string | null; clientId: string;
  ownerId: string; actorId: string; reference: string; snapshot: CarePlanSnapshot; existingIds: string[];
}) {
  const triggers: Array<{ key: string; title: string; priority: "HIGH" | "CRITICAL"; outcome: string }> = [];
  const carePackage = object(input.snapshot.carePackage);
  const medication = object(input.snapshot.medication);
  if (["Review required", "Insufficient / unsafe"].includes(String(carePackage.sufficiency))) triggers.push({ key: "package", title: "Resolve care-package sufficiency and obtain commissioner / management decision", priority: carePackage.sufficiency === "Insufficient / unsafe" ? "CRITICAL" : "HIGH", outcome: "The commissioned package safely meets assessed needs." });
  if (medication.reconciliation === "Required") triggers.push({ key: "medication", title: "Complete care-plan medication reconciliation against the authoritative medicines record", priority: "HIGH", outcome: "Medication support instructions agree with the current authorised medicines record." });
  const ids = [...input.existingIds];
  for (const trigger of triggers) {
    const issueKey = `care-plan:${input.carePlanId}:${trigger.key}`;
    const existing = await tx.action.findFirst({ where: { organisationId: input.organisationId, issueKey, status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] } }, select: { id: true } });
    if (existing) { if (!ids.includes(existing.id)) ids.push(existing.id); continue; }
    const dueDate = new Date(); dueDate.setUTCDate(dueDate.getUTCDate() + (trigger.priority === "CRITICAL" ? 0 : 1));
    const action = await tx.action.create({ data: { organisationId: input.organisationId, locationId: input.locationId, clientId: input.clientId, reference: makeActionReference(), title: trigger.title, description: trigger.title, category: "Care quality", expectedOutcome: trigger.outcome, successMeasure: "A named manager verifies the updated plan, evidence and implementation.", sourceType: "ASSESSMENT", sourceRecordId: input.carePlanId, sourceReference: input.reference, sourceUrl: `/care-plans/${input.carePlanId}`, issueKey, ownerId: input.ownerId, priority: trigger.priority, dueDate, status: "OPEN", lifecycleStatus: "ACTION_REQUIRED", evidenceRequired: true, createdById: input.actorId } });
    await tx.actionUpdate.create({ data: { actionId: action.id, userId: input.actorId, note: `Automatically created from care plan ${input.reference}.`, status: "OPEN", progressPercent: 0 } });
    ids.push(action.id);
  }
  return [...new Set(ids)];
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
