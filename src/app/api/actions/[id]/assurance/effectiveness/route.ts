import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { linkActionEvidence } from "@/lib/action-assurance";
import { actionScopeWhere } from "@/lib/actions";
import { syncFindingFromAction, validateEffectivenessReview } from "@/lib/assurance-improvement";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) }, include: { verifications: { where: { verificationType: "CLOSURE" }, orderBy: { verifiedAt: "desc" }, take: 1 }, evidenceLinks: { where: { retiredAt: null } } } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    if (action.closedAt) throw new Error("This Action is already closed. Reopen it before recording a new effectiveness decision.");
    const verification = action.verifications[0] ?? null, reviewDate = parseOptionalDate(form.get("reviewDate")), nextReviewDate = parseOptionalDate(form.get("nextReviewDate")), recurrenceFound = form.get("recurrenceFound") === "true";
    if (verification?.outcome !== "VERIFIED") throw new Error("A verified completion decision is required before effectiveness can be assessed.");
    const input = { outcome: text(form, "outcome"), observedResult: text(form, "observedResult"), decision: text(form, "decision"), recurrenceFound, reviewDate, verifiedAt: verification?.verifiedAt ?? null, nextReviewDate };
    validateEffectivenessReview(input);
    const evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))], authorisedEvidence = new Set(action.evidenceLinks.map((item) => item.evidenceId));
    if (evidenceIds.some((evidenceId) => !authorisedEvidence.has(evidenceId))) throw new Error("Effectiveness review can use only evidence linked to this action.");
    if (!evidenceIds.length) throw new Error("Select evidence showing the observed result after implementation.");
    const effective = input.outcome === "EFFECTIVE" && !recurrenceFound, reopened = recurrenceFound || input.outcome === "INEFFECTIVE";
    await db.$transaction(async (tx) => {
      await linkActionEvidence(tx, { actionId: id, organisationId: context.organisation.id, evidenceIds, role: "EFFECTIVENESS", actorId: context.user.id });
      await tx.effectivenessReview.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, actionId: id, verificationId: verification?.id, reviewDate: reviewDate!, outcome: input.outcome as never, successMeasure: action.successMeasure ?? "Success measure not recorded", baseline: text(form, "baseline") || null, target: text(form, "target") || null, observedResult: input.observedResult, recurrenceFound, evidenceIds, decision: input.decision, nextReviewDate, reviewerId: context.user.id } });
      const updated = await tx.action.update({ where: { id }, data: { lifecycleStatus: effective ? "READY_FOR_CLOSURE" : reopened ? "REOPENED_REPEAT_FINDING" : "AWAITING_EFFECTIVENESS", status: reopened ? "IN_PROGRESS" : "AWAITING_VERIFICATION", sustainedImprovementAt: effective ? reviewDate : null, recurrenceCount: recurrenceFound ? { increment: 1 } : undefined, nextRecurrenceReviewDate: nextReviewDate, closedAt: null, closedById: null, closureAssuranceRationale: null } });
      await syncFindingFromAction(tx, updated);
      if (recurrenceFound) await tx.recurrenceCase.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, reference: `REC-${action.reference}-${updated.recurrenceCount}`, actionId: id, detectedAt: reviewDate!, relatedFindingReference: `FND-${action.reference}`, narrative: input.observedResult, previousControlFailure: input.decision, immediateControl: text(form, "immediateControl") || "Action reopened for immediate control review.", managementEscalation: text(form, "managementEscalation") || "Escalate to the accountable manager for review.", ownerId: action.ownerId } });
      await tx.actionUpdate.create({ data: { actionId: id, userId: context.user.id, note: `Effectiveness outcome: ${input.outcome.replaceAll("_", " ").toLowerCase()}.`, status: reopened ? "IN_PROGRESS" : "AWAITING_VERIFICATION" } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "EffectivenessReview", recordId: id, summary: `Recorded effectiveness review for ${action.reference}`, afterValue: { outcome: input.outcome, recurrenceFound, reviewDate, nextReviewDate, lifecycleStatus: updated.lifecycleStatus, evidenceRole: "EFFECTIVENESS", closureCreated: false } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record effectiveness." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
