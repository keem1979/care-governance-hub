import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const db = createDb();
  try {
    const locationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] };
    const item = await db.calendarItem.findFirst({ where: { id, organisationId: context.organisation.id, ...locationScope } });
    if (!item) return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
    const body = await request.json() as { intent?: string };
    const status = body.intent === "complete" ? "COMPLETED" : body.intent === "reopen" ? "PENDING" : body.intent === "archive" ? "ARCHIVED" : null;
    if (!status) throw new Error("Unknown calendar action.");
    await db.$transaction([
      db.calendarItem.update({ where: { id }, data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: item.locationId, userId: context.user.id, action: body.intent === "archive" ? "ARCHIVE" : "UPDATE", recordType: "CalendarItem", recordId: id, summary: `${body.intent === "archive" ? "Archived" : body.intent === "complete" ? "Completed" : "Reopened"} compliance deadline: ${item.title}`, beforeValue: { status: item.status }, afterValue: { status } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update deadline." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
