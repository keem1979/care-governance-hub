import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ASSIGNED_TASKS_EDIT]);
  const { id } = await params;
  const db = createDb();
  try {
    const view = await db.managementSavedView.findFirst({ where: { id, organisationId: context.organisation.id, userId: context.user.id } });
    if (!view) return NextResponse.json({ error: "Saved view not found." }, { status: 404 });
    await db.$transaction([
      db.managementSavedView.delete({ where: { id: view.id } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: view.locationId, userId: context.user.id, action: "ARCHIVE", recordType: "ManagementSavedView", recordId: view.id, summary: `Removed saved management view: ${view.name}` } }),
    ]);
    return NextResponse.json({ ok: true });
  } finally {
    await db.$disconnect();
  }
}
