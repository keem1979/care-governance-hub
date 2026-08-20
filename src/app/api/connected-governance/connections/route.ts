import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ name: z.string().trim().min(3).max(120), vendor: z.string().trim().min(2).max(120), purpose: z.string().trim().min(12).max(2000), direction: z.enum(["INBOUND", "OUTBOUND", "BIDIRECTIONAL"]), dataClassification: z.string().trim().min(3).max(160), endpointUrl: z.union([z.literal(""), z.url().startsWith("https://")]), ownerId: z.uuid(), reviewDueAt: z.coerce.date(), locationId: z.union([z.literal(""), z.uuid()]) });

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), form = await request.formData(), db = createDb();
  try {
    const input = schema.parse(Object.fromEntries(form)), locationId = input.locationId || null;
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised location.");
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: input.ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active integration owner.");
    const keyBase = `${input.vendor}-${input.name}`.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70), key = keyBase || `connection-${crypto.randomUUID().slice(0, 8)}`;
    const connection = await db.$transaction(async (tx) => {
      const item = await tx.integrationConnection.create({ data: { organisationId: context.organisation.id, locationId, key, name: input.name, vendor: input.vendor, purpose: input.purpose, direction: input.direction, dataClassification: input.dataClassification, endpointUrl: input.endpointUrl || null, ownerId: input.ownerId, reviewDueAt: input.reviewDueAt, createdById: context.user.id, status: "REVIEW_REQUIRED" } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "IntegrationConnection", recordId: item.id, summary: `Created integration review: ${item.name}`, afterValue: { key, vendor: input.vendor, direction: input.direction, status: item.status, secretStored: false } } });
      return item;
    });
    return NextResponse.json({ id: connection.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: message(error, "Could not create the integration review.") }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

function message(error: unknown, fallback: string) { if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback; return error instanceof Error ? error.message : fallback; }
