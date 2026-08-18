import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { syncFindingFromAction, validateIndependentVerification } from "@/lib/assurance-improvement";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) }, include: { evidenceLinks: true, rootCauseReview: true } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    if (["HIGH", "CRITICAL"].includes(action.priority) && !["COMPLETED", "APPROVED"].includes(action.rootCauseReview?.status ?? "")) throw new Error("Complete the structured root-cause review before verifying a high or critical action.");
    const evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    const authorisedEvidence = new Set(action.evidenceLinks.map((item) => item.evidenceId));
    if (evidenceIds.some((evidenceId) => !authorisedEvidence.has(evidenceId))) throw new Error("Verification can use only evidence already linked to this action.");
    const verifierId = text(form, "verifierId"), verifiedAt = parseOptionalDate(form.get("verifiedAt"));
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: verifierId, status: "ACTIVE" } }))) throw new Error("Choose an active organisation member as verifier.");
    if (verifierId !== context.user.id) throw new Error("You can record only your own verification decision. The named verifier must sign in and complete this step.");
    const input = { outcome: text(form, "outcome"), completedWork: text(form, "completedWork"), evidenceSummary: text(form, "evidenceSummary"), evidenceCount: evidenceIds.length, successMeasureResult: text(form, "successMeasureResult"), rationale: text(form, "rationale"), verifierId, ownerId: action.ownerId, priority: action.priority, verifiedAt };
    validateIndependentVerification(input);
    const verified = input.outcome === "VERIFIED", status = verified ? "COMPLETED" : input.outcome === "FAILED" ? "IN_PROGRESS" : "AWAITING_VERIFICATION";
    const lifecycleStatus = verified ? (action.monitoringUntil && action.monitoringUntil > new Date() ? "MONITORING_RECURRENCE" : "CLOSED_VERIFIED") : input.outcome === "FAILED" ? "ACTION_IN_PROGRESS" : "AWAITING_VERIFICATION";
    await db.$transaction(async (tx) => {
      await tx.verification.upsert({ where: { actionId_verificationType: { actionId: id, verificationType: "CLOSURE" } }, create: { organisationId: context.organisation.id, locationId: action.locationId, actionId: id, verificationType: "CLOSURE", outcome: input.outcome as never, completedWork: input.completedWork, evidenceSummary: input.evidenceSummary, evidenceIds, successMeasureResult: input.successMeasureResult, independenceConfirmed: verifierId !== action.ownerId, rationale: input.rationale, verifierId, verifiedAt: verifiedAt! }, update: { outcome: input.outcome as never, completedWork: input.completedWork, evidenceSummary: input.evidenceSummary, evidenceIds, successMeasureResult: input.successMeasureResult, independenceConfirmed: verifierId !== action.ownerId, rationale: input.rationale, verifierId, verifiedAt: verifiedAt! } });
      const updated = await tx.action.update({ where: { id }, data: { status, lifecycleStatus, verifiedById: verifierId, verificationDate: verifiedAt, completedActionSummary: input.completedWork, evidenceReviewedSummary: input.evidenceSummary, verificationRationale: input.rationale, completionDate: verified ? verifiedAt : null, closureNote: verified ? input.successMeasureResult : null } });
      await syncFindingFromAction(tx, updated);
      await tx.actionUpdate.create({ data: { actionId: id, userId: context.user.id, note: `Independent verification outcome: ${input.outcome.replaceAll("_", " ").toLowerCase()}.`, status } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: "APPROVAL", recordType: "Verification", recordId: id, summary: `Recorded ${input.outcome.toLowerCase().replaceAll("_", " ")} verification for ${action.reference}`, afterValue: { outcome: input.outcome, verifierId, verifiedAt, evidenceCount: evidenceIds.length, independent: verifierId !== action.ownerId } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record verification." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
