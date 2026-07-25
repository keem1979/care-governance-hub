import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { REMINDER_OFFSETS } from "@/lib/calendar";
import { getCalendarEvents } from "@/lib/calendar-data";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const form = await request.formData();
  const eventKey = String(form.get("eventKey") ?? "");
  const offsetDays = Number(form.get("offsetDays"));
  const db = createDb();
  try {
    if (!REMINDER_OFFSETS.includes(offsetDays as never)) throw new Error("Choose a valid reminder time.");
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const to = new Date(Date.UTC(now.getUTCFullYear() + 3, 11, 31, 23, 59, 59));
    const events = await getCalendarEvents(context, from, to);
    if (!events.some((item) => item.key === eventKey)) throw new Error("That event is not available.");
    await db.calendarReminder.upsert({ where: { userId_eventKey_offsetDays: { userId: context.user.id, eventKey, offsetDays } }, create: { organisationId: context.organisation.id, userId: context.user.id, eventKey, offsetDays }, update: {} });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save reminder." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
