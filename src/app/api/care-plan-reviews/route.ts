import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/dal";
import { createCarePlanReviewActions, validateCarePlanReviewLinks } from "@/lib/care-plan-review-actions";
import {
  addRequiredAutomatedActions,
  CARE_PLAN_REVIEW_KEY, CARE_PLAN_REVIEW_VERSION,
  parseCarePlanReviewPayload, parseReviewActions, registerStatusForWorkflow,
  reviewRisk, validateCarePlanReview,
} from "@/lib/care-plan-reviews";
import { createDb } from "@/lib/db";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";
import { syncRegisterEvidence } from "@/lib/register-evidence";
import { makeRegisterReference } from "@/lib/registers";
import { syncCarePlanReviewProposal } from "@/lib/care-plan-review-sync";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const db = createDb();
  try {
    const ownerId = text(form, "ownerId") || null;
    const payload = addRequiredAutomatedActions(parsePayload(form), ownerId);
    if (payload.rmDecision && context.role.key !== ROLE_KEYS.REGISTERED_MANAGER) {
      throw new Error("Final Registered Manager assurance requires an authorised Registered Manager account.");
    }
    const clientId = text(form, "clientId") || null;
    const locationId = text(form, "locationId") || null;
    validateCarePlanReview({ payload, clientId, locationId, ownerId });
    await validateCarePlanReviewLinks(db, context, { clientId, locationId, ownerId, evidenceIds: form.getAll("evidenceIds").map(String).filter(Boolean), actions: parseReviewActions(payload.reviewActions) });
    const definition = await db.registerDefinition.findFirst({ where: { key: CARE_PLAN_REVIEW_KEY, isPublished: true, OR: [{ organisationId: context.organisation.id }, { organisationId: null }] } });
    if (!definition) return NextResponse.json({ error: "Care Plan Reviews is not available for this organisation." }, { status: 404 });
    const evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    const reference = text(form, "reference") || makeRegisterReference(CARE_PLAN_REVIEW_KEY);
    const eventDate = reviewEventDate(payload);
    const status = registerStatusForWorkflow(payload.workflowStatus);
    const riskLevel = reviewRisk(payload);
    const initialData = { carePlanReview: { ...payload, schemaVersion: CARE_PLAN_REVIEW_VERSION } };

    const entry = await db.$transaction(async (tx) => {
      const created = await tx.registerEntry.create({ data: {
        organisationId: context.organisation.id, definitionId: definition.id,
        locationId, clientId, reference, eventDate,
        title: `Care plan ${String(payload.carePlanReference)}`,
        summary: String(payload.reasonForReview), riskLevel: riskLevel as never,
        status: status as never, ownerId, data: initialData as Prisma.InputJsonValue,
        closureDate: status === "CLOSED" ? eventDate : null, createdById: context.user.id,
        evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) },
      } });
      const { actions, linkedActionIds } = await createCarePlanReviewActions(tx, parseReviewActions(payload.reviewActions), {
        organisationId: context.organisation.id, locationId, clientId,
        entryId: created.id, reviewReference: reference, actorId: context.user.id,
      });
      const carePlanProposal = await syncCarePlanReviewProposal(tx, { organisationId: context.organisation.id, actorId: context.user.id, reviewEntryId: created.id, reviewReference: reference, payload });
      const completedPayload = { ...payload, schemaVersion: CARE_PLAN_REVIEW_VERSION, reviewActions: actions };
      await tx.registerEntry.update({ where: { id: created.id }, data: { data: { carePlanReview: completedPayload } as Prisma.InputJsonValue, linkedActionIds } });
      await syncRegisterEvidence(tx, { entryId: created.id, organisationId: context.organisation.id, locationId, definitionKey: CARE_PLAN_REVIEW_KEY, definitionName: definition.name, reference, title: created.title, summary: created.summary, eventDate, ownerId, actorId: context.user.id, archived: false });
      await tx.registerEntryHistory.create({ data: { entryId: created.id, userId: context.user.id, action: "CREATED", snapshot: { status, riskLevel, carePlanReview: completedPayload } as Prisma.InputJsonValue } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "CarePlanReview", recordId: created.id, summary: `Created care-plan review ${reference}`, afterValue: { status, riskLevel, workflowStatus: payload.workflowStatus, linkedActionIds, carePlanProposal } } });
      return created;
    });
    return NextResponse.json({ id: entry.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the care-plan review." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

function parsePayload(form: FormData) {
  try { return parseCarePlanReviewPayload(JSON.parse(text(form, "carePlanReviewData"))); }
  catch { throw new Error("The care-plan review data could not be read. Please refresh and try again."); }
}

function reviewEventDate(payload: ReturnType<typeof parseCarePlanReviewPayload>) {
  const value = String(payload.reviewCompletedAt || payload.reviewDueDate || "");
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
