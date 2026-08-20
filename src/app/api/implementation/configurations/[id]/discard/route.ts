import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const version = await db.tenantConfigurationVersion.findFirst({ where: { id, organisationId: context.organisation.id, status: "DRAFT" } });
    if (!version) return NextResponse.json({ error: "Only a draft sandbox version can be withdrawn." }, { status: 404 });
    await db.$transaction([
      db.tenantConfigurationVersion.update({ where: { id }, data: { status: "REJECTED" } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "STATUS_CHANGE", recordType: "TenantConfigurationVersion", recordId: id, summary: `Withdrew sandbox configuration version ${version.versionNumber}`, beforeValue: { status: "DRAFT" }, afterValue: { status: "REJECTED", liveConfigurationChanged: false } } }),
      db.productAdoptionEvent.create({ data: { organisationId: context.organisation.id, userId: context.user.id, moduleKey: "implementation", eventName: "CONFIGURATION_WITHDRAWN" } }),
    ]);
    return NextResponse.json({ message: "Sandbox version withdrawn. The live configuration was not changed." });
  } finally { await db.$disconnect(); }
}
