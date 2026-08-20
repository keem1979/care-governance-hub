import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { generateIntegrationToken, hashIntegrationToken } from "@/lib/connected-governance";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ name: z.string().trim().min(3).max(100), expiresAt: z.union([z.literal(""), z.coerce.date()]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const input = schema.parse(Object.fromEntries(form)), connection = await db.integrationConnection.findFirst({ where: { id, organisationId: context.organisation.id, status: "ACTIVE", direction: { in: ["INBOUND", "BIDIRECTIONAL"] }, archivedAt: null } });
    if (!connection) throw new Error("Only an active inbound connection can receive an API token.");
    if (input.expiresAt && input.expiresAt <= new Date()) throw new Error("The token expiry must be in the future.");
    const token = generateIntegrationToken(), tokenHash = await hashIntegrationToken(token), tokenPrefix = token.slice(0, 24);
    const credential = await db.$transaction(async (tx) => {
      const item = await tx.integrationCredential.create({ data: { organisationId: context.organisation.id, connectionId: id, name: input.name, tokenPrefix, tokenHash, scopes: ["events:write"], expiresAt: input.expiresAt || null, createdById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: connection.locationId, userId: context.user.id, action: "CREATE", recordType: "IntegrationCredential", recordId: item.id, summary: `Issued API token for ${connection.name}`, afterValue: { tokenPrefix, scopes: item.scopes, expiresAt: item.expiresAt, tokenStored: false } } });
      return item;
    });
    return NextResponse.json({ id: credential.id, token, tokenPrefix, warning: "Copy this token now. It will not be shown again." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not issue the API token." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
