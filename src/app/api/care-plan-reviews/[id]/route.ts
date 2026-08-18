import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/dal";
import { createCarePlanReviewActions, validateCarePlanReviewLinks } from "@/lib/care-plan-review-actions";
import { addRequiredAutomatedActions, carePlanReviewData, parseCarePlanReviewPayload, parseReviewActions, registerStatusForWorkflow, reviewRisk, validateCarePlanReview } from "@/lib/care-plan-reviews";
import { createDb } from "@/lib/db";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";
import { syncRegisterEvidence } from "@/lib/register-evidence";
import { registerScopeWhere } from "@/lib/registers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const db = createDb();
  try {
    const entry = await db.registerEntry.findFirst({ where: { id, ...registerScopeWhere(context), definition: { key: "care-plan-reviews" } }, include: { definition: true } });
    if (!entry) return NextResponse.json({ error: "Care-plan review not found." }, { status: 404 });
    const ownerId = String(form.get("ownerId") ?? "") || null;
    let payload;
    try { payload = addRequiredAutomatedActions(parseCarePlanReviewPayload(JSON.parse(String(form.get("carePlanReviewData") ?? "{}"))), ownerId); }
    catch { throw new Error("The care-plan review data could not be read. Please refresh and try again."); }
    const previous = carePlanReviewData(entry.data);
    if (payload.rmDecision && context.role.key !== ROLE_KEYS.REGISTERED_MANAGER) {
      throw new Error("Final Registered Manager assurance requires an authorised Registered Manager account.");
    }
    const clientId = String(form.get("clientId") ?? "") || null;
    const locationId = String(form.get("locationId") ?? "") || null;
    validateCarePlanReview({ payload, clientId, locationId, ownerId });
    if (payload.rmDecision === "APPROVED") {
      const openCritical = await db.action.count({ where: { id: { in: entry.linkedActionIds }, organisationId: context.organisation.id, priority: "CRITICAL", status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] } } });
      if (openCritical) throw new Error("Critical assurance actions remain open. Resolve them before final approval.");
    }
    const evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    await validateCarePlanReviewLinks(db, context, { clientId, locationId, ownerId, evidenceIds, actions: parseReviewActions(payload.reviewActions) });
    const wasSigned = Boolean(String(previous.rmSignOffAt ?? "").trim());
    if (wasSigned && JSON.stringify(previous) !== JSON.stringify(payload) && !String(payload.reopenReason ?? "").trim()) {
      throw new Error("This signed review must be reopened with a recorded reason before material changes are saved.");
    }
    const status = registerStatusForWorkflow(payload.workflowStatus);
    const riskLevel = reviewRisk(payload);
    const eventValue = String(payload.reviewCompletedAt || payload.reviewDueDate || "");
    const eventDate = eventValue && !Number.isNaN(new Date(eventValue).getTime()) ? new Date(eventValue) : entry.eventDate;
    await db.$transaction(async (tx) => {
      const { actions, linkedActionIds } = await createCarePlanReviewActions(tx, parseReviewActions(payload.reviewActions), { organisationId: context.organisation.id, locationId, clientId, entryId: id, reviewReference: entry.reference, actorId: context.user.id });
      const completedPayload = { ...payload, schemaVersion: 2, reviewActions: actions };
      await tx.registerEntry.update({ where: { id }, data: { locationId, clientId, ownerId, eventDate, title: `Care plan ${String(payload.carePlanReference)}`, summary: String(payload.reasonForReview), riskLevel: riskLevel as never, status: status as never, closureDate: status === "CLOSED" ? eventDate : null, data: { carePlanReview: completedPayload } as Prisma.InputJsonValue, linkedActionIds, evidenceLinks: { deleteMany: {}, create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      await syncRegisterEvidence(tx, { entryId: id, organisationId: context.organisation.id, locationId, definitionKey: "care-plan-reviews", definitionName: entry.definition.name, reference: entry.reference, title: `Care plan ${String(payload.carePlanReference)}`, summary: String(payload.reasonForReview), eventDate, ownerId, actorId: context.user.id, archived: status === "ARCHIVED" });
      await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: wasSigned ? "REOPENED_AND_UPDATED" : "UPDATED", snapshot: { before: previous, after: completedPayload, reopenReason: payload.reopenReason || null } as Prisma.InputJsonValue } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "CarePlanReview", recordId: id, summary: `Updated care-plan review ${entry.reference}`, beforeValue: { status: entry.status, riskLevel: entry.riskLevel }, afterValue: { status, riskLevel, workflowStatus: payload.workflowStatus, linkedActionIds } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the care-plan review." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
