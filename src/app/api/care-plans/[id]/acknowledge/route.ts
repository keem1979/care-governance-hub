import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { carePlanScopeWhere } from "@/lib/care-plans";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ASSIGNED_TASKS_EDIT]);
  const { id } = await params;
  const db = createDb();
  try {
    const plan = await db.carePlan.findFirst({ where: { id, ...carePlanScopeWhere(context) }, include: { currentVersion: true } });
    if (!plan?.currentVersionId || plan.currentVersion?.status !== "PUBLISHED") return NextResponse.json({ error: "No approved current care-plan version is available." }, { status: 404 });
    const staff = await db.staffMember.findFirst({ where: { organisationId: context.organisation.id, userId: context.user.id, archivedAt: null }, select: { id: true } });
    if (!staff && !hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW)) return NextResponse.json({ error: "Ask a workforce manager to link your login to your staff profile before acknowledging care instructions." }, { status: 403 });
    if (staff) {
      const assigned = await db.carePlanStaffAssignment.findFirst({ where: { carePlanId: id, staffMemberId: staff.id, isActive: true, OR: [{ versionId: plan.currentVersionId }, { versionId: null }] } });
      if (!assigned) return NextResponse.json({ error: "These care instructions are not assigned to your staff profile." }, { status: 403 });
    }
    const requirement = staff ? await db.acknowledgementRequirement.findUnique({ where: { versionId_staffMemberId: { versionId: plan.currentVersionId, staffMemberId: staff.id } } }) : null;
    const acknowledgedAt = new Date();
    await db.$transaction(async (tx) => {
      await tx.carePlanAcknowledgement.upsert({
        where: { versionId_userId: { versionId: plan.currentVersionId!, userId: context.user.id } },
        create: { carePlanId: id, versionId: plan.currentVersionId!, userId: context.user.id, staffMemberId: staff?.id ?? null, requirementId: requirement?.id ?? null, declaration: "I have read the approved current care-plan version and will follow its authorised instructions.", acknowledgedAt },
        update: { staffMemberId: staff?.id ?? null, requirementId: requirement?.id ?? null, acknowledgedAt },
      });
      if (requirement) await tx.acknowledgementRequirement.update({ where: { id: requirement.id }, data: { status: requirement.requiresUnderstandingCheck ? "ACKNOWLEDGED" : "COMPLETE", completedAt: requirement.requiresUnderstandingCheck ? null : acknowledgedAt } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: plan.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "CarePlanAcknowledgement", recordId: id, summary: `Acknowledged approved care plan ${plan.reference} version ${plan.currentVersionNumber}`, afterValue: { versionId: plan.currentVersionId, staffMemberId: staff?.id ?? null, understandingRequired: requirement?.requiresUnderstandingCheck ?? false } } });
    });
    return NextResponse.json({ ok: true, understandingRequired: requirement?.requiresUnderstandingCheck ?? false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record acknowledgement." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
