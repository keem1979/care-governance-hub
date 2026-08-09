import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

function clean(form: FormData, key: string, max: number) {
  const value = String(form.get(key) ?? "").trim();
  if (value.length > max) throw new Error(`${key} is too long.`);
  return value || null;
}

export async function PATCH(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE);
  try {
    const form = await request.formData();
    const policyBrandName = clean(form, "policyBrandName", 160);
    if (!policyBrandName) throw new Error("Enter a policy display name.");
    const policyRegistrationNumber = clean(form, "policyRegistrationNumber", 80);
    const policyAddress = clean(form, "policyAddress", 500);
    const policyEmail = clean(form, "policyEmail", 180);
    const policyPhone = clean(form, "policyPhone", 80);
    const policyWebsite = clean(form, "policyWebsite", 250);
    const policyPrimaryColour = String(form.get("policyPrimaryColour") ?? "#0f766e").trim();
    if (!/^#[0-9a-f]{6}$/i.test(policyPrimaryColour)) throw new Error("Choose a valid brand colour.");
    if (policyEmail && !/^\S+@\S+\.\S+$/.test(policyEmail)) throw new Error("Enter a valid policy contact email.");
    if (policyWebsite && !/^https:\/\//i.test(policyWebsite)) throw new Error("The website must begin with https://.");
    const data = { policyBrandName, policyRegistrationNumber, policyAddress, policyEmail, policyPhone, policyWebsite, policyPrimaryColour };
    const db = createDb();
    try {
      await db.$transaction([
        db.organisation.update({ where: { id: context.organisation.id }, data }),
        db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE", recordType: "PolicyBranding", recordId: context.organisation.id, summary: "Updated Policy Studio branding and contact details.", afterValue: data } }),
      ]);
      return NextResponse.json({ message: "Policy branding saved." });
    } finally { await db.$disconnect(); }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Branding could not be saved." }, { status: 400 });
  }
}
