import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const credential = await db.integrationCredential.findFirst({ where: { id, organisationId: context.organisation.id }, include: { connection: { select: { name: true, locationId: true } } } });
    if (!credential) return NextResponse.json({ error: "API credential not found." }, { status: 404 });
    if (!credential.revokedAt) await db.$transaction([db.integrationCredential.update({ where: { id }, data: { revokedAt: new Date() } }), db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: credential.connection.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "IntegrationCredential", recordId: id, summary: `Revoked API token for ${credential.connection.name}`, afterValue: { tokenPrefix: credential.tokenPrefix, revoked: true } } })]);
    return NextResponse.json({ ok: true });
  } finally { await db.$disconnect(); }
}
