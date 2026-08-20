import { NextResponse } from "next/server";
import { z } from "zod";
import { commercialIntentSchema, isExternalPayingIntent } from "@/lib/launch-readiness";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PUT(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), db = createDb();
  try {
    const input = commercialIntentSchema.parse(await request.json()), pilot = await db.launchPilot.findFirst({ where: { id: input.pilotId, organisationId: context.organisation.id } });
    if (!pilot) return NextResponse.json({ error: "The pilot was not found." }, { status: 404 });
    if (pilot.cohort !== "EXTERNAL_PROVIDER") return NextResponse.json({ error: "Commercial intent can only be recorded against an external-provider pilot." }, { status: 409 });
    const targetDecisionDate = input.targetDecisionDate ? new Date(`${input.targetDecisionDate}T12:00:00.000Z`) : null;
    const record = await db.$transaction(async (tx) => {
      const saved = await tx.commercialIntentRecord.upsert({ where: { pilotId: pilot.id }, create: { organisationId: context.organisation.id, pilotId: pilot.id, status: input.status, buyerRole: input.buyerRole, proposedPlan: input.proposedPlan, licenceEstimate: input.licenceEstimate, targetDecisionDate, evidenceNote: input.evidenceNote, recordedById: context.user.id }, update: { status: input.status, buyerRole: input.buyerRole, proposedPlan: input.proposedPlan, licenceEstimate: input.licenceEstimate, targetDecisionDate, evidenceNote: input.evidenceNote, recordedById: context.user.id, recordedAt: new Date() } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE", recordType: "CommercialIntentRecord", recordId: saved.id, summary: `Recorded commercial intent for ${pilot.name}`, afterValue: { status: input.status, licenceEstimate: input.licenceEstimate, targetDecisionDate: input.targetDecisionDate || null, qualifiesAsExternalPayingIntent: isExternalPayingIntent(pilot.cohort, input.status) } } });
      return saved;
    });
    return NextResponse.json({ id: record.id, message: "Commercial intent evidence saved." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Commercial intent could not be saved." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
