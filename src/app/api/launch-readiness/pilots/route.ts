import { NextResponse } from "next/server";
import { z } from "zod";
import { createPilotSchema } from "@/lib/launch-readiness";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), db = createDb();
  try {
    const input = createPilotSchema.parse(await request.json());
    const pilot = await db.$transaction(async (tx) => {
      const created = await tx.launchPilot.create({ data: { ...input, organisationId: context.organisation.id, ownerId: context.user.id, createdById: context.user.id, startDate: atNoon(input.startDate), targetEndDate: atNoon(input.targetEndDate) } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "LaunchPilot", recordId: created.id, summary: `Created ${input.cohort === "EXTERNAL_PROVIDER" ? "external provider" : "internal DBAM"} pilot: ${input.name}`, afterValue: { cohort: input.cohort, status: "PLANNED", startDate: input.startDate, targetEndDate: input.targetEndDate, locationCount: input.locationCount } } });
      await tx.productAdoptionEvent.create({ data: { organisationId: context.organisation.id, userId: context.user.id, moduleKey: "launch-readiness", eventName: "PILOT_CREATED" } });
      return created;
    });
    return NextResponse.json({ id: pilot.id, message: "Controlled pilot created." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The pilot could not be created." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

function atNoon(value: string) { return new Date(`${value}T12:00:00.000Z`); }
