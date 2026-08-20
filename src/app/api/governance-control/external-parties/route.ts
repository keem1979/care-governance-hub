import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), form = await request.formData(), db = createDb();
  try {
    const name = text(form, "name"), partyType = text(form, "partyType"), email = text(form, "email") || null, phone = text(form, "phone") || null, locationId = text(form, "locationId") || null;
    if (name.length < 2 || partyType.length < 2) throw new Error("Enter the external party name and type.");
    if (!email && !phone) throw new Error("Add an email address or phone number.");
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised location.");
    const duplicate = await db.externalParty.findFirst({ where: { organisationId: context.organisation.id, name: { equals: name, mode: "insensitive" }, archivedAt: null } });
    if (duplicate) throw new Error("This external party already exists. Use the controlled record instead of creating a duplicate.");
    const party = await db.$transaction(async (tx) => {
      const created = await tx.externalParty.create({ data: { organisationId: context.organisation.id, locationId, name, partyType, email, phone, address: text(form, "address") || null, notes: text(form, "notes") || null } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "ExternalParty", recordId: created.id, summary: `Added controlled external party: ${name}`, afterValue: { name, partyType, email, phone } } });
      return created;
    });
    return NextResponse.json({ id: party.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add the external party." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
