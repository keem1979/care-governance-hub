import { NextResponse } from "next/server";
import { z } from "zod";
import { buildConfigurationSettings, configurationInputSchema } from "@/lib/configurable-delivery";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), db = createDb();
  try {
    const input = configurationInputSchema.parse(await request.json());
    const open = await db.tenantConfigurationVersion.findFirst({ where: { organisationId: context.organisation.id, status: { in: ["DRAFT", "SUBMITTED"] } }, select: { id: true, status: true } });
    if (open) return NextResponse.json({ error: `Version ${open.status.toLowerCase()} already exists. Complete or reject it before creating another.` }, { status: 409 });
    const maximum = await db.tenantConfigurationVersion.aggregate({ where: { organisationId: context.organisation.id }, _max: { versionNumber: true } });
    const versionNumber = (maximum._max.versionNumber ?? 0) + 1, settings = buildConfigurationSettings(input);
    const version = await db.$transaction(async (tx) => {
      const created = await tx.tenantConfigurationVersion.create({ data: { organisationId: context.organisation.id, versionNumber, settings, changeSummary: input.changeSummary, createdById: context.user.id } });
      await tx.implementationPlan.updateMany({ where: { organisationId: context.organisation.id, stage: "SETUP" }, data: { stage: "SANDBOX", updatedById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "TenantConfigurationVersion", recordId: created.id, summary: `Created sandbox configuration version ${versionNumber}`, afterValue: { versionNumber, status: "DRAFT", settings, safeDefaultsLocked: true } } });
      await tx.productAdoptionEvent.create({ data: { organisationId: context.organisation.id, userId: context.user.id, moduleKey: "implementation", eventName: "CONFIGURATION_CREATED" } });
      return created;
    });
    return NextResponse.json({ id: version.id, versionNumber: version.versionNumber, message: `Sandbox version ${version.versionNumber} created.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The sandbox version could not be created." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
