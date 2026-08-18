import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { allowedManagementViews, MANAGEMENT_FOCUSES } from "@/lib/management-intelligence";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ASSIGNED_TASKS_EDIT]);
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const commandView = String(form.get("view") ?? "");
  const focus = String(form.get("focus") ?? "ALL");
  const locationId = String(form.get("locationId") ?? "") || null;
  const isDefault = form.get("isDefault") === "on";
  if (name.length < 2) return NextResponse.json({ error: "Give the saved view a clear name." }, { status: 400 });
  if (!allowedManagementViews(context.role.key, context.allLocations).includes(commandView as never)) return NextResponse.json({ error: "That command view is not available for your role." }, { status: 403 });
  if (!MANAGEMENT_FOCUSES.includes(focus as never)) return NextResponse.json({ error: "Choose a valid focus." }, { status: 400 });
  if (locationId && !context.locations.some(({ id }) => id === locationId)) return NextResponse.json({ error: "Choose a location you are authorised to view." }, { status: 403 });
  if (commandView === "LOCATION" && !locationId) return NextResponse.json({ error: "Choose a location for this view." }, { status: 400 });

  const db = createDb();
  try {
    const saved = await db.$transaction(async (tx) => {
      if (isDefault) await tx.managementSavedView.updateMany({ where: { organisationId: context.organisation.id, userId: context.user.id }, data: { isDefault: false } });
      const existing = await tx.managementSavedView.findUnique({ where: { organisationId_userId_name: { organisationId: context.organisation.id, userId: context.user.id, name } } });
      const record = existing
        ? await tx.managementSavedView.update({ where: { id: existing.id }, data: { commandView: commandView as never, focus: focus as never, locationId, isDefault } })
        : await tx.managementSavedView.create({ data: { organisationId: context.organisation.id, userId: context.user.id, name, commandView: commandView as never, focus: focus as never, locationId, isDefault } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: existing ? "UPDATE" : "CREATE", recordType: "ManagementSavedView", recordId: record.id, summary: `${existing ? "Updated" : "Saved"} management view: ${name}`, afterValue: { commandView, focus, locationId, isDefault } } });
      return record;
    });
    return NextResponse.json({ id: saved.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the view." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
