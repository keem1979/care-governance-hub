import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { carePlanScopeWhere } from "@/lib/care-plans";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.WORKFORCE_MANAGE]);
  const { id } = await params;
  const form = await request.formData();
  const trainingCourseId = String(form.get("trainingCourseId") ?? "");
  const instructions = String(form.get("instructions") ?? "").trim().slice(0, 1000);
  const critical = form.get("critical") === "on";
  if (instructions.length < 10) return NextResponse.json({ error: "Explain why this competency is required for the current care instructions." }, { status: 400 });
  const db = createDb();
  try {
    const [plan, course] = await Promise.all([
      db.carePlan.findFirst({ where: { id, ...carePlanScopeWhere(context), currentVersion: { status: "PUBLISHED" } }, select: { id: true, reference: true, locationId: true, currentVersionId: true } }),
      db.trainingCourse.findFirst({ where: { id: trainingCourseId, archivedAt: null, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] }, select: { id: true, title: true } }),
    ]);
    if (!plan?.currentVersionId) return NextResponse.json({ error: "Only an approved current care-plan version can have competency assurance requirements." }, { status: 400 });
    if (!course) return NextResponse.json({ error: "Choose an authorised competency from the workforce catalogue." }, { status: 400 });
    const record = await db.$transaction(async (tx) => {
      const requirement = await tx.careCompetencyRequirement.upsert({ where: { versionId_trainingCourseId: { versionId: plan.currentVersionId!, trainingCourseId } }, create: { organisationId: context.organisation.id, locationId: plan.locationId, carePlanId: id, versionId: plan.currentVersionId!, trainingCourseId, label: course.title, instructions, critical, createdById: context.user.id }, update: { label: course.title, instructions, critical } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: plan.locationId, userId: context.user.id, action: "CREATE", recordType: "CareCompetencyRequirement", recordId: requirement.id, summary: `Set ${course.title} requirement for ${plan.reference}`, afterValue: { versionId: plan.currentVersionId, trainingCourseId, critical } } });
      return requirement;
    });
    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add the competency requirement." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
