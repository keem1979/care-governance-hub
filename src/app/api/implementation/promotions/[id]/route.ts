import { NextResponse } from "next/server";
import { z } from "zod";
import { assertIndependentPromotion, implementationReadiness, parseConfigurationSettings } from "@/lib/configurable-delivery";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), reviewComment: z.string().trim().min(12).max(1500) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const input = schema.parse(await request.json());
    const promotion = await db.configurationPromotion.findFirst({ where: { id, organisationId: context.organisation.id, status: "PENDING" }, include: { configurationVersion: true } });
    if (!promotion) return NextResponse.json({ error: "The promotion request is not available for review." }, { status: 404 });
    try { assertIndependentPromotion(context.user.id, promotion.configurationVersion.createdById, promotion.requestedById); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "A different authorised manager must review this request." }, { status: 409 }); }
    const plan = await db.implementationPlan.findUnique({ where: { organisationId: context.organisation.id }, include: { items: true } });
    const readiness = implementationReadiness(plan?.items ?? []);
    if (input.decision === "APPROVED") {
      parseConfigurationSettings(promotion.configurationVersion.settings);
      if (!plan || !readiness.ready) return NextResponse.json({ error: "Go-live readiness is no longer complete. Resolve the checklist before approval." }, { status: 409 });
    }
    const now = new Date();
    await db.$transaction(async (tx) => {
      await tx.configurationPromotion.update({ where: { id }, data: { status: input.decision, reviewedById: context.user.id, reviewedAt: now, reviewComment: input.reviewComment } });
      if (input.decision === "APPROVED") {
        await tx.tenantConfigurationVersion.updateMany({ where: { organisationId: context.organisation.id, status: "PUBLISHED" }, data: { status: "SUPERSEDED" } });
        await tx.tenantConfigurationVersion.update({ where: { id: promotion.configurationVersionId }, data: { status: "PUBLISHED", approvedById: context.user.id, publishedAt: now } });
        if (plan) await tx.implementationPlan.update({ where: { id: plan.id }, data: { stage: "LIVE", liveAt: now, updatedById: context.user.id } });
      } else {
        await tx.tenantConfigurationVersion.update({ where: { id: promotion.configurationVersionId }, data: { status: "REJECTED" } });
        if (plan) await tx.implementationPlan.update({ where: { id: plan.id }, data: { stage: "SANDBOX", readyAt: null, updatedById: context.user.id } });
      }
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "STATUS_CHANGE", recordType: "ConfigurationPromotion", recordId: id, summary: `${input.decision === "APPROVED" ? "Approved" : "Rejected"} configuration version ${promotion.configurationVersion.versionNumber}`, beforeValue: { status: "PENDING" }, afterValue: { status: input.decision, independentlyReviewed: true, safetyControlsValidated: input.decision === "APPROVED" } } });
      await tx.productAdoptionEvent.create({ data: { organisationId: context.organisation.id, userId: context.user.id, moduleKey: "implementation", eventName: input.decision === "APPROVED" ? "PROMOTION_APPROVED" : "PROMOTION_REJECTED" } });
    });
    return NextResponse.json({ message: input.decision === "APPROVED" ? "Configuration promoted to live." : "Configuration rejected and returned to sandbox." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The promotion decision could not be recorded." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
