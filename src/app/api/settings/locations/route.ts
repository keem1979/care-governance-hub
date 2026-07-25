import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { normaliseLocationCode } from "@/lib/settings";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const form = await request.formData();
  const name = text(form, "name"), code = normaliseLocationCode(form.get("code"));
  if (name.length < 3 || !code) return NextResponse.json({ error: "Enter a location name and code." }, { status: 400 });
  const db = createDb();
  try {
    const location = await db.$transaction(async (tx) => {
      const created = await tx.serviceLocation.create({ data: { organisationId: context.organisation.id, name, code, addressLine1: optional(form, "addressLine1"), town: optional(form, "town"), postcode: optional(form, "postcode") } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: created.id, userId: context.user.id, action: "CREATE", recordType: "ServiceLocation", recordId: created.id, summary: `Created service location: ${name}`, afterValue: { code } } });
      return created;
    });
    return NextResponse.json({ id: location.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message.includes("Unique") ? "That location code is already in use." : "Could not add the location." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function optional(form: FormData, key: string) { return text(form, key) || null; }
