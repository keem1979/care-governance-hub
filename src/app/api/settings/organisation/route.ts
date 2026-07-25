import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE);
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 3 || name.length > 120) return NextResponse.json({ error: "Enter an organisation name between 3 and 120 characters." }, { status: 400 });
  const db = createDb();
  try {
    const current = await db.organisation.findUnique({ where: { id: context.organisation.id }, select: { name: true } });
    if (!current) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
    await db.$transaction([
      db.organisation.update({ where: { id: context.organisation.id }, data: { name } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE", recordType: "Organisation", recordId: context.organisation.id, summary: `Updated organisation name to ${name}.`, beforeValue: { name: current.name }, afterValue: { name } } }),
    ]);
    return NextResponse.json({ ok: true });
  } finally { await db.$disconnect(); }
}
