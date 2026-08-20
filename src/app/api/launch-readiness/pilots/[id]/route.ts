import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPilotTransition, pilotStatusSchema } from "@/lib/launch-readiness";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const input = pilotStatusSchema.parse(await request.json());
    const pilot = await db.launchPilot.findFirst({ where: { id, organisationId: context.organisation.id }, include: { measures: { select: { status: true } } } });
    if (!pilot) return NextResponse.json({ error: "The pilot was not found." }, { status: 404 });
    assertPilotTransition(pilot.status, input.status);
    if (input.status === "COMPLETE" && !pilot.measures.some((item) => item.status === "VERIFIED")) return NextResponse.json({ error: "A pilot needs at least one independently verified outcome measure before completion." }, { status: 409 });
    const now = new Date();
    await db.$transaction([
      db.launchPilot.update({ where: { id }, data: { status: input.status, completedAt: input.status === "COMPLETE" ? now : null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "STATUS_CHANGE", recordType: "LaunchPilot", recordId: id, summary: `Moved pilot ${pilot.name} to ${input.status.toLowerCase().replaceAll("_", " ")}`, beforeValue: { status: pilot.status }, afterValue: { status: input.status, verifiedOutcomeRequired: input.status === "COMPLETE" } } }),
      db.productAdoptionEvent.create({ data: { organisationId: context.organisation.id, userId: context.user.id, moduleKey: "launch-readiness", eventName: `PILOT_${input.status}` } }),
    ]);
    return NextResponse.json({ message: "Pilot status updated." });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The pilot could not be updated.";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally { await db.$disconnect(); }
}
