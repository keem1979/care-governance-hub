import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { normaliseLocationCode } from "@/lib/settings";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const { id } = await params, form = await request.formData(), db = createDb();
  try {
    const location = await db.serviceLocation.findFirst({ where: { id, organisationId: context.organisation.id } });
    if (!location) return NextResponse.json({ error: "Location not found." }, { status: 404 });
    const intent = String(form.get("intent") ?? "update");
    if (intent === "archive" || intent === "restore") {
      const active = intent === "restore";
      await db.$transaction([
        db.serviceLocation.update({ where: { id }, data: { isActive: active, archivedAt: active ? null : new Date() } }),
        db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: id, userId: context.user.id, action: active ? "RESTORE" : "ARCHIVE", recordType: "ServiceLocation", recordId: id, summary: `${active ? "Restored" : "Archived"} service location: ${location.name}` } }),
      ]);
      return NextResponse.json({ ok: true });
    }
    const name = String(form.get("name") ?? "").trim(), code = normaliseLocationCode(form.get("code"));
    if (name.length < 3 || !code) throw new Error("Enter a location name and code.");
    const after = { name, code, addressLine1: optional(form, "addressLine1"), town: optional(form, "town"), postcode: optional(form, "postcode") };
    await db.$transaction([
      db.serviceLocation.update({ where: { id }, data: after }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: id, userId: context.user.id, action: "UPDATE", recordType: "ServiceLocation", recordId: id, summary: `Updated service location: ${name}`, beforeValue: { name: location.name, code: location.code }, afterValue: after } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the location." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
function optional(form: FormData, key: string) { return String(form.get(key) ?? "").trim() || null; }
