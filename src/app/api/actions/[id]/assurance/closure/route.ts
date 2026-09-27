import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { actionAssuranceReadiness, currentAssuranceCycle, evaluateActionClosureAuthority, linkActionEvidence, resolveActionAssurancePolicy, resolveActionClosureAuthority } from "@/lib/action-assurance";
import { syncFindingFromAction } from "@/lib/assurance-improvement";
import { actionEligibleEvidenceWhere, actionScopeWhere, assertActionWriteScope } from "@/lib/actions";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const action = await db.action.findFirst({
      where: { id, ...actionScopeWhere(context) },
      include: {
        evidenceLinks: { where: { retiredAt: null } },
        verifications: { where: { verificationType: "CLOSURE" }, orderBy: { createdAt: "desc" } },
        effectivenessReviews: { orderBy: { createdAt: "desc" } },
        externalDependencies: { where: { status: { notIn: ["RESOLVED", "CANCELLED"] } }, select: { id: true } },
        rootCauseReview: { select: { status: true } },
      },
    });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    assertActionWriteScope(context, action.locationId);
    const lastReopen = await db.activityLog.findFirst({ where: { organisationId: context.organisation.id, locationId: action.locationId, recordType: "ActionClosure", recordId: id, action: "STATUS_CHANGE" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    const currentCycle = currentAssuranceCycle({ reopenedAt: lastReopen?.createdAt ?? null, completionDate: action.completionDate, verifications: action.verifications, effectivenessReviews: action.effectivenessReviews });
    const closureAuthority = await resolveActionClosureAuthority(db, { organisationId: context.organisation.id, priority: action.priority, sourceType: action.sourceType, sourceRecordId: action.sourceRecordId });
    const authority = evaluateActionClosureAuthority({ hasActionCapability: context.permissions.includes(PERMISSIONS.ACTIONS_MANAGE), actorRoleKey: context.role.key, authorisedRoleKeys: closureAuthority.authorisedRoleKeys });
    if (!authority.allowed) throw new Error(authority.configurationIssue ? "Your provider role has governance authority but is missing the technical Action-management capability. An organisation administrator must correct the permission configuration." : "Your current provider role is not authorised by the applicable Action closure policy.");
    const intent = String(form.get("intent") ?? "close");
    if (intent === "reopen") {
      if (!action.closedAt) throw new Error("This Action is not closed.");
      const reopenReason = String(form.get("rationale") ?? "").trim();
      if (reopenReason.length < 12) throw new Error("Record why this Action requires renewed governance review.");
      await db.$transaction(async (tx) => {
        const updated = await tx.action.update({ where: { id }, data: { status: "IN_PROGRESS", lifecycleStatus: "REOPENED_REPEAT_FINDING", progressPercent: 0, completionDate: null, verifiedById: null, verificationDate: null, closedById: null, closedAt: null, closureAssuranceRationale: null, sustainedImprovementAt: null } });
        await syncFindingFromAction(tx, updated);
        await tx.actionUpdate.create({ data: { actionId: id, userId: context.user.id, note: `Authorised manager reopened the Action: ${reopenReason}`, status: "IN_PROGRESS" } });
        await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "ActionClosure", recordId: id, summary: `Reopened Action ${action.reference}: ${reopenReason}`, beforeValue: { status: action.status, closedAt: action.closedAt, closureRationale: action.closureAssuranceRationale }, afterValue: { status: "IN_PROGRESS", reopenedById: context.user.id, rationale: reopenReason } } });
      });
      return NextResponse.json({ ok: true });
    }
    if (intent !== "close") throw new Error("Unknown closure decision.");
    if (action.closedAt) throw new Error("This Action is already closed.");
    if (action.archivedAt || ["ARCHIVED", "CANCELLED"].includes(action.status)) throw new Error("Archived or cancelled Actions cannot be closed.");
    const assurancePolicy = action.sourceType === "RISK" ? undefined : await resolveActionAssurancePolicy(db, { organisationId: context.organisation.id, priority: action.priority, sourceType: action.sourceType });
    const rationale = String(form.get("rationale") ?? "").trim();
    if (rationale.length < 12) throw new Error("Record the management assurance rationale for closure.");
    const closureEvidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    const eligibleRows = await db.evidence.findMany({ where: { id: { in: action.evidenceLinks.map(item => item.evidenceId) }, ...actionEligibleEvidenceWhere(context, action.locationId) }, select: { id: true } });
    const eligibleEvidence = new Set(eligibleRows.map(item => item.id));
    const authorisedEvidence = new Set(action.evidenceLinks.filter(item => eligibleEvidence.has(item.evidenceId)).map((item) => item.evidenceId));
    if (!closureEvidenceIds.length || closureEvidenceIds.some((evidenceId) => !authorisedEvidence.has(evidenceId))) throw new Error("Choose closure evidence already linked to this Action and within your authorised scope.");
    const roleCounts = action.evidenceLinks.filter(item => eligibleEvidence.has(item.evidenceId)).reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.role]: (counts[item.role] ?? 0) + 1 }), {});
    roleCounts.CLOSURE = Math.max(roleCounts.CLOSURE ?? 0, closureEvidenceIds.length);
    const readiness = actionAssuranceReadiness({
      priority: action.priority,
      sourceType: action.sourceType,
      progressPercent: action.progressPercent,
      completionDate: action.completionDate,
      ownerId: action.ownerId,
      closerId: context.user.id,
      verification: currentCycle.verification ? { outcome: currentCycle.verification.outcome, verifierId: currentCycle.verification.verifierId } : null,
      effectiveness: currentCycle.effectiveness ? { outcome: currentCycle.effectiveness.outcome, recurrenceFound: currentCycle.effectiveness.recurrenceFound } : null,
      roleCounts,
      unresolvedDependencies: action.externalDependencies.length,
      rootCauseComplete: ["COMPLETED", "APPROVED"].includes(action.rootCauseReview?.status ?? ""),
      policy: assurancePolicy,
    });
    if (!readiness.ready) return NextResponse.json({ error: "This Action is not ready for authorised closure.", requirements: readiness.outstanding }, { status: 409 });
    const now = new Date();
    await db.$transaction(async (tx) => {
      await linkActionEvidence(tx, { actionId: id, organisationId: context.organisation.id, evidenceIds: closureEvidenceIds, role: "CLOSURE", actorId: context.user.id });
      const updated = await tx.action.update({ where: { id }, data: { status: "COMPLETED", lifecycleStatus: readiness.policy.effectivenessRequired ? "SUSTAINED_IMPROVEMENT" : "CLOSED_VERIFIED", closedById: context.user.id, closedAt: now, closureAssuranceRationale: rationale, closureNote: rationale, completionDate: action.completionDate ?? now } });
      await syncFindingFromAction(tx, updated);
      await tx.actionUpdate.create({ data: { actionId: id, userId: context.user.id, note: "Management assurance completed and Action closed. Completion, verification and effectiveness remained separate decisions.", status: "COMPLETED", progressPercent: 100 } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: "APPROVAL", recordType: "ActionClosure", recordId: id, summary: `Authorised closure of ${action.reference}`, afterValue: { closerId: context.user.id, closerRole: context.role.key, closedAt: now, evidenceIds: closureEvidenceIds, rationale, policy: readiness.policy, closureAuthority, checks: readiness.checks } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record the closure decision." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
