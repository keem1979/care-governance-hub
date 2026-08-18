import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { carePlanScopeWhere } from "@/lib/care-plans";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ASSIGNED_TASKS_EDIT]);
  const { id } = await params;
  const form = await request.formData();
  const response = String(form.get("response") ?? "").trim().slice(0, 2000);
  if (response.length < 20) return NextResponse.json({ error: "Explain the instruction, what you must not do and when you would escalate." }, { status: 400 });
  const db = createDb();
  try {
    const plan = await db.carePlan.findFirst({ where: { id, ...carePlanScopeWhere(context), currentVersion: { status: "PUBLISHED" } }, select: { id: true, reference: true, locationId: true, currentVersionId: true, currentVersionNumber: true } });
    const staff = await db.staffMember.findFirst({ where: { organisationId: context.organisation.id, userId: context.user.id, archivedAt: null }, select: { id: true } });
    if (!plan?.currentVersionId || !staff) return NextResponse.json({ error: "No assigned approved instruction check is available for your account." }, { status: 404 });
    const requirement = await db.acknowledgementRequirement.findUnique({ where: { versionId_staffMemberId: { versionId: plan.currentVersionId, staffMemberId: staff.id } }, include: { understandingCheck: true, acknowledgement: true } });
    if (!requirement?.requiresUnderstandingCheck || !requirement.understandingCheck) return NextResponse.json({ error: "This version does not require an understanding check." }, { status: 400 });
    if (!requirement.acknowledgement || requirement.acknowledgement.userId !== context.user.id) return NextResponse.json({ error: "Acknowledge the approved current version before submitting the understanding check." }, { status: 400 });
    await db.$transaction([
      db.understandingCheck.update({ where: { id: requirement.understandingCheck.id }, data: { staffResponse: response, submittedAt: new Date(), completedById: context.user.id, outcome: "AWAITING_REVIEW", assessedById: null, assessedAt: null, assessorNotes: null } }),
      db.acknowledgementRequirement.update({ where: { id: requirement.id }, data: { status: "UNDERSTANDING_SUBMITTED", completedAt: null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: plan.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "UnderstandingCheck", recordId: requirement.understandingCheck.id, summary: `Submitted understanding check for ${plan.reference} version ${plan.currentVersionNumber}`, afterValue: { outcome: "AWAITING_REVIEW", requirementId: requirement.id } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not submit the understanding check." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
