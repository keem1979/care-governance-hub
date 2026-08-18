import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { isCriticalCareChange, understandingPrompt } from "@/lib/care-workforce-assurance";
import { carePlanScopeWhere, parseCarePlanSnapshot, validateCarePlanAssurance } from "@/lib/care-plans";
import { createDb } from "@/lib/db";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const db = createDb();
  try {
    if (context.role.key !== ROLE_KEYS.REGISTERED_MANAGER) throw new Error("Publishing a clinical care plan requires an authorised Registered Manager account.");
    const form = await request.formData();
    const versionId = String(form.get("versionId") ?? "");
    const decision = String(form.get("decision") ?? "");
    const plan = await db.carePlan.findFirst({ where: { id, ...carePlanScopeWhere(context) } });
    if (!plan) return NextResponse.json({ error: "Care plan not found." }, { status: 404 });
    const version = await db.carePlanVersion.findFirst({ where: { id: versionId, carePlanId: id, status: { in: ["DRAFT", "AWAITING_APPROVAL", "APPROVED"] } }, include: { changes: true } });
    if (!version) throw new Error("Choose the current proposed care-plan version.");
    validateCarePlanAssurance(parseCarePlanSnapshot(version.snapshot), decision);
    if (plan.overallRisk === "CRITICAL" && plan.linkedActionIds.length) {
      const open = await db.action.count({ where: { id: { in: plan.linkedActionIds }, organisationId: context.organisation.id, priority: "CRITICAL", status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] } } });
      if (open && decision === "APPROVE AND PUBLISH") throw new Error("Critical actions remain open. Use Approved With Actions with explicit interim controls or resolve them first.");
    }
    const assignments = await db.carePlanStaffAssignment.findMany({ where: { carePlanId: id, isActive: true, OR: [{ versionId: version.id }, { versionId: null }] }, select: { staffMemberId: true } });
    const criticalChange = isCriticalCareChange({ overallRisk: plan.overallRisk, materialSections: version.materialSections, materialSeverities: version.changes.map((change) => change.riskImpact) });
    const acknowledgementRequired = version.acknowledgementRequired || criticalChange;
    const publishedAt = new Date();
    const effectiveDate = version.effectiveDate ?? publishedAt;
    const dueAt = new Date(publishedAt.getTime() + (criticalChange ? 2 : 7) * 86_400_000);
    await db.$transaction(async (tx) => {
      if (plan.currentVersionId && plan.currentVersionId !== version.id) await tx.carePlanVersion.updateMany({ where: { id: plan.currentVersionId, status: "PUBLISHED" }, data: { status: "SUPERSEDED" } });
      await tx.carePlanVersion.update({ where: { id: version.id }, data: { status: "PUBLISHED", approvedById: context.user.id, approvedAt: publishedAt, publishedAt, effectiveDate, acknowledgementRequired, changes: { updateMany: { where: { approvalStatus: "PENDING" }, data: { approvalStatus: "APPROVED", approvedById: context.user.id, approvedAt: publishedAt } } } } });
      await tx.materialChange.updateMany({ where: { organisationId: context.organisation.id, carePlanId: id, carePlanVersionId: version.id, status: "PROPOSED" }, data: { status: "APPLIED", approvedById: context.user.id, approvedAt: publishedAt, appliedAt: publishedAt } });
      await tx.carePlan.update({ where: { id }, data: { currentVersionId: version.id, currentVersionNumber: version.versionNumber, status: decision === "APPROVE WITH ACTIONS" ? "ACTIVE_WITH_ACTIONS" : "ACTIVE", effectiveDate, nextReviewDate: version.nextReviewDate, staffAcknowledgementRequired: acknowledgementRequired } });
      if (acknowledgementRequired) for (const assignment of assignments) {
        const requirement = await tx.acknowledgementRequirement.upsert({
          where: { versionId_staffMemberId: { versionId: version.id, staffMemberId: assignment.staffMemberId } },
          create: { organisationId: context.organisation.id, locationId: plan.locationId, carePlanId: id, versionId: version.id, staffMemberId: assignment.staffMemberId, reason: criticalChange ? "Critical or safety-related care instructions changed." : "The published version requires staff acknowledgement.", materialSections: version.materialSections, criticalChange, requiresUnderstandingCheck: criticalChange, dueAt },
          update: { reason: criticalChange ? "Critical or safety-related care instructions changed." : "The published version requires staff acknowledgement.", materialSections: version.materialSections, criticalChange, requiresUnderstandingCheck: criticalChange, dueAt, status: "REQUIRED", completedAt: null },
        });
        if (criticalChange) await tx.understandingCheck.upsert({ where: { requirementId: requirement.id }, create: { organisationId: context.organisation.id, locationId: plan.locationId, requirementId: requirement.id, prompt: understandingPrompt(plan.reference, version.versionNumber, version.materialSections) }, update: { prompt: understandingPrompt(plan.reference, version.versionNumber, version.materialSections), outcome: "PENDING", staffResponse: null, submittedAt: null, assessedById: null, assessedAt: null, assessorNotes: null } });
      }
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: plan.locationId, userId: context.user.id, action: "APPROVAL", recordType: "CarePlan", recordId: id, summary: `Approved and published care plan ${plan.reference} version ${version.versionNumber}`, afterValue: { decision, version: version.versionNumber, changedSections: version.materialSections, criticalChange, acknowledgementRequirements: acknowledgementRequired ? assignments.length : 0, dependencyReviewsRemainControlled: true } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not publish the care plan." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
