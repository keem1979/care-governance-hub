import { NextResponse } from "next/server";
import { z } from "zod";
import { createMeasureSchema, MEASURE_DEFINITIONS } from "@/lib/launch-readiness";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const input = createMeasureSchema.parse(await request.json()), pilot = await db.launchPilot.findFirst({ where: { id, organisationId: context.organisation.id } });
    if (!pilot) return NextResponse.json({ error: "The pilot was not found." }, { status: 404 });
    if (["COMPLETE", "WITHDRAWN"].includes(pilot.status)) return NextResponse.json({ error: "Measures cannot be changed after a pilot is complete or withdrawn." }, { status: 409 });
    const definition = MEASURE_DEFINITIONS[input.type], outcomeValue = typeof input.outcomeValue === "number" ? input.outcomeValue : null, status = outcomeValue === null ? "BASELINE_ONLY" : "OUTCOME_RECORDED";
    const existing = await db.launchOutcomeMeasure.findUnique({ where: { pilotId_type: { pilotId: id, type: input.type } } });
    if (existing?.status === "VERIFIED") return NextResponse.json({ error: "A verified measure is controlled and cannot be overwritten." }, { status: 409 });
    const measure = await db.$transaction(async (tx) => {
      const saved = existing
        ? await tx.launchOutcomeMeasure.update({ where: { id: existing.id }, data: { baselineValue: input.baselineValue, outcomeValue, sampleSize: input.sampleSize, measurementMethod: input.measurementMethod, evidenceReference: input.evidenceReference, status, recordedById: context.user.id, verifiedById: null, verifiedAt: null, verificationNote: null } })
        : await tx.launchOutcomeMeasure.create({ data: { organisationId: context.organisation.id, pilotId: id, type: input.type, label: definition.label, unit: definition.unit, direction: definition.direction, baselineValue: input.baselineValue, outcomeValue, sampleSize: input.sampleSize, measurementMethod: input.measurementMethod, evidenceReference: input.evidenceReference, status, recordedById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: existing ? "UPDATE" : "CREATE", recordType: "LaunchOutcomeMeasure", recordId: saved.id, summary: `${existing ? "Updated" : "Recorded"} pilot measure: ${definition.label}`, afterValue: { pilotId: id, type: input.type, status, sampleSize: input.sampleSize, evidenceReference: input.evidenceReference } } });
      return saved;
    });
    return NextResponse.json({ id: measure.id, message: outcomeValue === null ? "Baseline recorded." : "Outcome recorded and awaiting independent verification." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The outcome measure could not be saved." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
