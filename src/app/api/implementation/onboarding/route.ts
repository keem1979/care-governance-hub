import { NextResponse } from "next/server";
import { z } from "zod";
import { ONBOARDING_ITEMS } from "@/lib/configurable-delivery";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ targetLiveDate: z.string().date() });

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), db = createDb();
  try {
    const input = schema.parse(await request.json()), targetLiveDate = new Date(`${input.targetLiveDate}T12:00:00.000Z`);
    if (targetLiveDate < new Date()) return NextResponse.json({ error: "Choose a target go-live date in the future." }, { status: 400 });
    const existing = await db.implementationPlan.findUnique({ where: { organisationId: context.organisation.id }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "An implementation plan already exists for this organisation." }, { status: 409 });
    const plan = await db.$transaction(async (tx) => {
      const created = await tx.implementationPlan.create({ data: { organisationId: context.organisation.id, ownerId: context.user.id, updatedById: context.user.id, targetLiveDate, items: { create: ONBOARDING_ITEMS.map((item) => ({ ...item })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "ImplementationPlan", recordId: created.id, summary: "Started the controlled QCGMS implementation plan", afterValue: { stage: "SETUP", targetLiveDate: input.targetLiveDate, requiredItems: ONBOARDING_ITEMS.length } } });
      await tx.productAdoptionEvent.create({ data: { organisationId: context.organisation.id, userId: context.user.id, moduleKey: "implementation", eventName: "ONBOARDING_STARTED" } });
      return created;
    });
    return NextResponse.json({ id: plan.id, message: "Implementation plan started." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The implementation plan could not be started." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
