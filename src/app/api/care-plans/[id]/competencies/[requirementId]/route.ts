import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { carePlanScopeWhere } from "@/lib/care-plans";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; requirementId: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.WORKFORCE_MANAGE]);
  const { id, requirementId } = await params;
  const db = createDb();
  try {
    const plan = await db.carePlan.findFirst({ where: { id, ...carePlanScopeWhere(context) }, select: { locationId: true, reference: true, currentVersionId: true } });
    const requirement = plan?.currentVersionId ? await db.careCompetencyRequirement.findFirst({ where: { id: requirementId, organisationId: context.organisation.id, carePlanId: id, versionId: plan.currentVersionId } }) : null;
    if (!plan || !requirement) return NextResponse.json({ error: "Current competency requirement not found." }, { status: 404 });
    await db.$transaction([
      db.careCompetencyRequirement.delete({ where: { id: requirement.id } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: plan.locationId, userId: context.user.id, action: "ARCHIVE", recordType: "CareCompetencyRequirement", recordId: requirement.id, summary: `Removed ${requirement.label} requirement from ${plan.reference}` } }),
    ]);
    return NextResponse.json({ ok: true });
  } finally {
    await db.$disconnect();
  }
}
