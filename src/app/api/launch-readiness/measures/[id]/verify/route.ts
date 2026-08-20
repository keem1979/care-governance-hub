import { NextResponse } from "next/server";
import { z } from "zod";
import { assertIndependentMeasureVerification, verifyMeasureSchema } from "@/lib/launch-readiness";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const input = verifyMeasureSchema.parse(await request.json()), measure = await db.launchOutcomeMeasure.findFirst({ where: { id, organisationId: context.organisation.id, status: "OUTCOME_RECORDED", outcomeValue: { not: null } }, include: { pilot: { select: { name: true } } } });
    if (!measure) return NextResponse.json({ error: "The outcome measure is not available for review." }, { status: 404 });
    assertIndependentMeasureVerification(measure.recordedById, context.user.id);
    const now = new Date();
    await db.$transaction([
      db.launchOutcomeMeasure.update({ where: { id }, data: { status: input.decision, verifiedById: context.user.id, verifiedAt: now, verificationNote: input.verificationNote } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "APPROVAL", recordType: "LaunchOutcomeMeasure", recordId: id, summary: `${input.decision === "VERIFIED" ? "Verified" : "Rejected"} ${measure.label} for ${measure.pilot.name}`, beforeValue: { status: measure.status }, afterValue: { status: input.decision, independentReview: true } } }),
    ]);
    return NextResponse.json({ message: input.decision === "VERIFIED" ? "Outcome measure independently verified." : "Outcome measure rejected for correction." });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The review could not be recorded.";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally { await db.$disconnect(); }
}
