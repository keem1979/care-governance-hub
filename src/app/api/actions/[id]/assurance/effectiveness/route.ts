import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { currentAssuranceCycle, linkActionEvidence } from "@/lib/action-assurance";
import { actionEligibleEvidenceWhere, actionScopeWhere, assertActionWriteScope } from "@/lib/actions";
import { syncFindingFromAction, validateEffectivenessReview } from "@/lib/assurance-improvement";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) }, include: { verifications: { where: { verificationType: "CLOSURE" }, orderBy: { createdAt: "desc" } }, evidenceLinks: { where: { retiredAt: null } } } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    assertActionWriteScope(context, action.locationId);
    if (action.closedAt) throw new Error("This Action is already closed. Reopen it before recording a new effectiveness decision.");
    if (action.archivedAt || ["ARCHIVED", "CANCELLED"].includes(action.status)) throw new Error("Archived or cancelled Actions cannot receive an effectiveness decision.");
    const recurrenceValue = String(form.get("recurrenceFound") ?? "");
    if (!["true", "false"].includes(recurrenceValue)) throw new Error("Choose whether a repeat problem was found.");
    const lastReopen = await db.activityLog.findFirst({ where: { organisationId: context.organisation.id, locationId: action.locationId, recordType: "ActionClosure", recordId: id, action: "STATUS_CHANGE" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    const { verification } = currentAssuranceCycle({ reopenedAt: lastReopen?.createdAt ?? null, completionDate: action.completionDate, verifications: action.verifications, effectivenessReviews: [] });
    const reviewDate = parseOptionalDate(form.get("reviewDate")), nextReviewDate = parseOptionalDate(form.get("nextReviewDate")), recurrenceFound = recurrenceValue === "true";
    if (verification?.outcome !== "VERIFIED") throw new Error("A verified completion decision is required before effectiveness can be assessed.");
    const input = { outcome: text(form, "outcome"), observedResult: text(form, "observedResult"), decision: text(form, "decision"), recurrenceFound, reviewDate, verifiedAt: verification?.verifiedAt ?? null, nextReviewDate };
    validateEffectivenessReview(input);
    const immediateControl = text(form, "immediateControl"), managementEscalation = text(form, "managementEscalation");
    if (recurrenceFound && (immediateControl.length < 8 || managementEscalation.length < 8)) throw new Error("Record the immediate control and management escalation for a repeat problem.");
    const evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))], authorisedEvidence = new Set(action.evidenceLinks.map((item) => item.evidenceId));
    if (evidenceIds.some((evidenceId) => !authorisedEvidence.has(evidenceId))) throw new Error("Effectiveness review can use only evidence linked to this action.");
    if (!evidenceIds.length) throw new Error("Select evidence showing the observed result after implementation.");
    const eligibleEvidence = await db.evidence.count({ where: { id: { in: evidenceIds }, ...actionEligibleEvidenceWhere(context, action.locationId) } });
    if (eligibleEvidence !== evidenceIds.length) throw new Error("Effectiveness requires active Evidence in this Action's authorised location or organisation-wide scope.");
    const effective = input.outcome === "EFFECTIVE" && !recurrenceFound, reopened = recurrenceFound || input.outcome === "INEFFECTIVE";
    await db.$transaction(async (tx) => {
      await linkActionEvidence(tx, { actionId: id, organisationId: context.organisation.id, evidenceIds, role: "EFFECTIVENESS", actorId: context.user.id });
      await tx.effectivenessReview.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, actionId: id, verificationId: verification?.id, reviewDate: reviewDate!, outcome: input.outcome as never, successMeasure: action.successMeasure ?? "Success measure not recorded", baseline: text(form, "baseline") || null, target: text(form, "target") || null, observedResult: input.observedResult, recurrenceFound, evidenceIds, decision: input.decision, nextReviewDate, reviewerId: context.user.id } });
      const updated = await tx.action.update({ where: { id }, data: { lifecycleStatus: effective ? "READY_FOR_CLOSURE" : reopened ? "REOPENED_REPEAT_FINDING" : "AWAITING_EFFECTIVENESS", status: reopened ? "IN_PROGRESS" : "AWAITING_VERIFICATION", sustainedImprovementAt: effective ? reviewDate : null, recurrenceCount: recurrenceFound ? { increment: 1 } : undefined, nextRecurrenceReviewDate: nextReviewDate, closedAt: null, closedById: null, closureAssuranceRationale: null } });
      await syncFindingFromAction(tx, updated);
      if (recurrenceFound) await tx.recurrenceCase.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, reference: `REC-${action.reference}-${updated.recurrenceCount}`, actionId: id, detectedAt: reviewDate!, relatedFindingReference: `FND-${action.reference}`, narrative: input.observedResult, previousControlFailure: input.decision, immediateControl, managementEscalation, ownerId: action.ownerId } });
      await tx.actionUpdate.create({ data: { actionId: id, userId: context.user.id, note: `Effectiveness outcome: ${input.outcome.replaceAll("_", " ").toLowerCase()}.`, status: reopened ? "IN_PROGRESS" : "AWAITING_VERIFICATION" } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "EffectivenessReview", recordId: id, summary: `Recorded effectiveness review for ${action.reference}`, afterValue: { outcome: input.outcome, recurrenceFound, reviewDate, nextReviewDate, lifecycleStatus: updated.lifecycleStatus, evidenceRole: "EFFECTIVENESS", closureCreated: false } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record effectiveness." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
