import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { CALENDAR_ITEM_TYPES } from "@/lib/calendar";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const db = createDb();
  try {
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    const itemType = String(form.get("itemType") ?? "");
    const dueDate = parseOptionalDate(form.get("dueDate"));
    const locationId = String(form.get("locationId") ?? "") || null;
    const ownerId = String(form.get("ownerId") ?? "") || null;
    const riskLevel = String(form.get("riskLevel") ?? "") || null;
    if (title.length < 3 || !dueDate) throw new Error("Enter a title and valid due date.");
    if (!CALENDAR_ITEM_TYPES.includes(itemType as never)) throw new Error("Choose a valid deadline type.");
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");
    if (ownerId && !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active organisation member.");
    if (riskLevel && !["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(riskLevel)) throw new Error("Choose a valid risk level.");
    const item = await db.$transaction(async (tx) => {
      const created = await tx.calendarItem.create({ data: { organisationId: context.organisation.id, locationId, title, description, itemType: itemType as never, dueDate, ownerId, riskLevel, createdById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "CalendarItem", recordId: created.id, summary: `Created compliance deadline: ${title}`, afterValue: { itemType, dueDate, ownerId, riskLevel } } });
      return created;
    });
    return NextResponse.json({ id: item.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create deadline." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
