import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { workforceScopeWhere } from "@/lib/workforce";
import { syncTrainingMatrixEvidence } from "@/lib/workforce-evidence";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.WORKFORCE_MANAGE); const form = await request.formData(); const staffMemberId = String(form.get("staffMemberId") ?? ""); const trainingCourseId = String(form.get("trainingCourseId") ?? ""); const db = createDb();
  try { const [staff, course] = await Promise.all([db.staffMember.findFirst({ where: { id: staffMemberId, ...workforceScopeWhere(context) }, select: { id: true, locationId: true, employeeReference: true } }), db.trainingCourse.findFirst({ where: { id: trainingCourseId, archivedAt: null, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] }, select: { id: true, title: true } })]); if (!staff || !course) return NextResponse.json({ error: "Choose an authorised worker and catalogue course." }, { status: 400 }); const requirement = await db.$transaction(async (tx) => { const item = await tx.staffTrainingRequirement.upsert({ where: { staffMemberId_trainingCourseId: { staffMemberId, trainingCourseId } }, create: { organisationId: context.organisation.id, staffMemberId, trainingCourseId, requiredBy: parseOptionalDate(form.get("requiredBy")) }, update: { requiredBy: parseOptionalDate(form.get("requiredBy")), archivedAt: null, exempt: false, exemptionReason: null } }); await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: staff.locationId, userId: context.user.id, action: "CREATE", recordType: "StaffTrainingRequirement", recordId: item.id, summary: `Assigned ${course.title} to ${staff.employeeReference}` } }); await syncTrainingMatrixEvidence(tx, { organisationId: context.organisation.id, actorId: context.user.id }); return item; }); return NextResponse.json({ id: requirement.id }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not assign training." }, { status: 400 }); } finally { await db.$disconnect(); }
}
