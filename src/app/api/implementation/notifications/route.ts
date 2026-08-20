import { NextResponse } from "next/server";
import { z } from "zod";
import { notificationPreferenceSchema } from "@/lib/configurable-delivery";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";

export async function PUT(request: Request) {
  const context = await requireAuthorisedContext(), db = createDb();
  try {
    const input = notificationPreferenceSchema.parse(await request.json());
    const preference = await db.$transaction(async (tx) => {
      const item = await tx.notificationPreference.upsert({ where: { membershipId_category: { membershipId: context.membershipId, category: input.category } }, create: { organisationId: context.organisation.id, membershipId: context.membershipId, category: input.category, enabled: input.enabled, cadence: input.cadence, updatedById: context.user.id }, update: { enabled: input.enabled, cadence: input.cadence, updatedById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE", recordType: "NotificationPreference", recordId: item.id, summary: `Updated ${input.category.toLowerCase().replaceAll("_", " ")} notifications`, afterValue: { category: input.category, enabled: input.enabled, cadence: input.cadence } } });
      await tx.productAdoptionEvent.create({ data: { organisationId: context.organisation.id, userId: context.user.id, moduleKey: "implementation", eventName: "NOTIFICATION_PREFERENCE_UPDATED" } });
      return item;
    });
    return NextResponse.json({ category: preference.category, enabled: preference.enabled, cadence: preference.cadence, message: "Notification preference saved." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : "The notification preference could not be saved." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
