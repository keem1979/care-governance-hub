import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { deletePolicyFile, getPolicyFile, putPolicyFile } from "@/lib/policy-storage";

export const runtime = "nodejs";
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function GET() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const db = createDb();
  try {
    const organisation = await db.organisation.findUnique({ where: { id: context.organisation.id }, select: { policyLogoStorageKey: true, policyLogoContentType: true } });
    if (!organisation?.policyLogoStorageKey || !organisation.policyLogoContentType) return new Response("Logo not found", { status: 404 });
    const body = await getPolicyFile(organisation.policyLogoStorageKey);
    if (!body) return new Response("Logo not found", { status: 404 });
    return new Response(body, { headers: { "Content-Type": organisation.policyLogoContentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src 'self'" } });
  } finally { await db.$disconnect(); }
}

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE);
  const form = await request.formData();
  const logo = form.get("logo");
  if (!(logo instanceof File) || logo.size === 0) return NextResponse.json({ error: "Choose a PNG, JPEG or WebP logo." }, { status: 400 });
  if (!allowedTypes.has(logo.type)) return NextResponse.json({ error: "The logo must be a PNG, JPEG or WebP image." }, { status: 400 });
  if (logo.size > 2 * 1024 * 1024) return NextResponse.json({ error: "The logo must be smaller than 2 MB." }, { status: 400 });
  const storageKey = `${context.organisation.id}/policy-brand/${crypto.randomUUID()}`;
  const db = createDb();
  try {
    const current = await db.organisation.findUnique({ where: { id: context.organisation.id }, select: { policyLogoStorageKey: true, policyLogoFileName: true } });
    await putPolicyFile(storageKey, await logo.arrayBuffer());
    try {
      await db.$transaction([
        db.organisation.update({ where: { id: context.organisation.id }, data: { policyLogoStorageKey: storageKey, policyLogoContentType: logo.type, policyLogoFileName: logo.name.slice(0, 180), policyLogoUploadedAt: new Date() } }),
        db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE", recordType: "PolicyBranding", recordId: context.organisation.id, summary: "Updated the licensed organisation policy-header logo.", beforeValue: { fileName: current?.policyLogoFileName }, afterValue: { fileName: logo.name, contentType: logo.type, size: logo.size } } }),
      ]);
    } catch (error) { await deletePolicyFile(storageKey); throw error; }
    if (current?.policyLogoStorageKey && current.policyLogoStorageKey !== storageKey) await deletePolicyFile(current.policyLogoStorageKey);
    return NextResponse.json({ message: "Header logo uploaded." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The logo could not be uploaded." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

export async function DELETE() {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE);
  const db = createDb();
  try {
    const current = await db.organisation.findUnique({ where: { id: context.organisation.id }, select: { policyLogoStorageKey: true, policyLogoFileName: true } });
    if (!current?.policyLogoStorageKey) return NextResponse.json({ message: "No header logo is stored." });
    await db.$transaction([
      db.organisation.update({ where: { id: context.organisation.id }, data: { policyLogoStorageKey: null, policyLogoContentType: null, policyLogoFileName: null, policyLogoUploadedAt: null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE", recordType: "PolicyBranding", recordId: context.organisation.id, summary: "Removed the licensed organisation policy-header logo.", beforeValue: { fileName: current.policyLogoFileName } } }),
    ]);
    await deletePolicyFile(current.policyLogoStorageKey);
    return NextResponse.json({ message: "Header logo removed." });
  } finally { await db.$disconnect(); }
}
