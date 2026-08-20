import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ entityType: z.enum(["CLIENT", "STAFF_MEMBER", "SERVICE_LOCATION", "EXTERNAL_PARTY"]), connectionId: z.union([z.literal(""), z.uuid()]), sourceSystem: z.string().trim().min(2).max(120), authorityLevel: z.enum(["AUTHORITATIVE", "CONTRIBUTING", "REFERENCE_ONLY"]), governedFields: z.string().trim().min(2).max(1000), rationale: z.string().trim().min(12).max(2000), reviewDueAt: z.coerce.date() });

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), form = await request.formData(), db = createDb();
  try {
    const input = schema.parse(Object.fromEntries(form)), connectionId = input.connectionId || null;
    if (connectionId && !(await db.integrationConnection.findFirst({ where: { id: connectionId, organisationId: context.organisation.id, status: "ACTIVE", archivedAt: null } }))) throw new Error("Only an active approved connection can be assigned as a source.");
    if (input.reviewDueAt <= new Date()) throw new Error("The authority review date must be in the future.");
    const governedFields = [...new Set(input.governedFields.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
    const before = await db.sourceAuthority.findUnique({ where: { organisationId_entityType: { organisationId: context.organisation.id, entityType: input.entityType } } });
    const record = await db.$transaction(async (tx) => {
      const item = await tx.sourceAuthority.upsert({ where: { organisationId_entityType: { organisationId: context.organisation.id, entityType: input.entityType } }, create: { organisationId: context.organisation.id, entityType: input.entityType, connectionId, sourceSystem: input.sourceSystem, authorityLevel: input.authorityLevel, governedFields, rationale: input.rationale, approvedById: context.user.id, reviewDueAt: input.reviewDueAt }, update: { connectionId, sourceSystem: input.sourceSystem, authorityLevel: input.authorityLevel, governedFields, rationale: input.rationale, approvedById: context.user.id, approvedAt: new Date(), reviewDueAt: input.reviewDueAt } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: before ? "UPDATE" : "CREATE", recordType: "SourceAuthority", recordId: item.id, summary: `Approved ${input.entityType.toLowerCase().replaceAll("_", " ")} source authority`, beforeValue: before ? { sourceSystem: before.sourceSystem, authorityLevel: before.authorityLevel } : undefined, afterValue: { sourceSystem: input.sourceSystem, authorityLevel: input.authorityLevel, governedFields, connectionId } } });
      return item;
    });
    return NextResponse.json({ id: record.id });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not save source authority." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
