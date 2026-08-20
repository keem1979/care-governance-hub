import { NextResponse } from "next/server";
import { implementationReadiness, parseConfigurationSettings } from "@/lib/configurable-delivery";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const [version, plan] = await Promise.all([
      db.tenantConfigurationVersion.findFirst({ where: { id, organisationId: context.organisation.id, status: "DRAFT" } }),
      db.implementationPlan.findUnique({ where: { organisationId: context.organisation.id }, include: { items: true } }),
    ]);
    if (!version) return NextResponse.json({ error: "The sandbox version is not available for submission." }, { status: 404 });
    parseConfigurationSettings(version.settings);
    const readiness = implementationReadiness(plan?.items ?? []);
    if (!plan || !readiness.ready) return NextResponse.json({ error: "Complete every required onboarding item with evidence before requesting live promotion." }, { status: 409 });
    const snapshot = { capturedAt: new Date().toISOString(), planId: plan.id, stage: plan.stage, requiredItems: readiness.required, completedItems: readiness.complete, allSafetyControlsLocked: true };
    const promotion = await db.$transaction(async (tx) => {
      await tx.tenantConfigurationVersion.update({ where: { id }, data: { status: "SUBMITTED", submittedAt: new Date() } });
      const created = await tx.configurationPromotion.create({ data: { organisationId: context.organisation.id, configurationVersionId: id, readinessSnapshot: snapshot, requestedById: context.user.id } });
      await tx.implementationPlan.update({ where: { id: plan.id }, data: { stage: "READY", readyAt: new Date(), updatedById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "STATUS_CHANGE", recordType: "ConfigurationPromotion", recordId: created.id, summary: `Submitted configuration version ${version.versionNumber} for independent promotion`, afterValue: { versionNumber: version.versionNumber, status: "PENDING", readiness: snapshot } } });
      await tx.productAdoptionEvent.create({ data: { organisationId: context.organisation.id, userId: context.user.id, moduleKey: "implementation", eventName: "PROMOTION_REQUESTED" } });
      return created;
    });
    return NextResponse.json({ id: promotion.id, message: "Promotion requested. A different authorised manager must review it." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The promotion request could not be created." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
