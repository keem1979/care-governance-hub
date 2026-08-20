import { NextResponse } from "next/server";
import { z } from "zod";
import { implementationItemUpdateSchema, implementationReadiness } from "@/lib/configurable-delivery";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const input = implementationItemUpdateSchema.parse(await request.json());
    const item = await db.implementationChecklistItem.findFirst({ where: { id, plan: { organisationId: context.organisation.id } }, include: { plan: { select: { id: true, stage: true } } } });
    if (!item) return NextResponse.json({ error: "The implementation item was not found." }, { status: 404 });
    if (item.plan.stage === "LIVE") return NextResponse.json({ error: "The live implementation record is controlled. Start a reviewed change rather than altering completed go-live evidence." }, { status: 409 });
    const now = new Date();
    await db.$transaction(async (tx) => {
      await tx.implementationChecklistItem.update({ where: { id }, data: { status: input.status, evidenceNote: input.evidenceNote || null, completedById: input.status === "COMPLETE" ? context.user.id : null, completedAt: input.status === "COMPLETE" ? now : null } });
      const items = await tx.implementationChecklistItem.findMany({ where: { planId: item.plan.id }, select: { required: true, status: true } }), readiness = implementationReadiness(items);
      await tx.implementationPlan.update({ where: { id: item.plan.id }, data: { stage: readiness.ready ? "PILOT" : item.plan.stage === "SETUP" ? "SETUP" : "SANDBOX", updatedById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "STATUS_CHANGE", recordType: "ImplementationChecklistItem", recordId: id, summary: `Updated implementation item: ${item.title}`, beforeValue: { status: item.status }, afterValue: { status: input.status, evidenceRecorded: Boolean(input.evidenceNote) } } });
      await tx.productAdoptionEvent.create({ data: { organisationId: context.organisation.id, userId: context.user.id, moduleKey: "implementation", eventName: input.status === "COMPLETE" ? "ONBOARDING_ITEM_COMPLETED" : "ONBOARDING_ITEM_UPDATED" } });
    });
    return NextResponse.json({ message: "Implementation evidence updated." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The implementation item could not be updated." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
