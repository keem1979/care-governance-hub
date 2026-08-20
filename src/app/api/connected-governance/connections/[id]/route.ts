import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { connectionCanActivate } from "@/lib/connected-governance";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const gates = ["gateBusinessNeed", "gateDataProtection", "gateSupplierAssurance", "gateSecurityDesign", "gateTechnicalMapping", "gateSafeTesting", "gateOperations", "gateApproval"] as const;
const schema = z.object({ intent: z.enum(["save-review", "activate", "pause", "revoke"]), reviewDueAt: z.coerce.date().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const input = schema.parse(Object.fromEntries(form)), existing = await db.integrationConnection.findFirst({ where: { id, organisationId: context.organisation.id, archivedAt: null } });
    if (!existing) return NextResponse.json({ error: "Integration connection not found." }, { status: 404 });
    const gateValues = Object.fromEntries(gates.map((gate) => [gate, form.get(gate) === "true"])) as Record<(typeof gates)[number], boolean>, reviewDueAt = input.reviewDueAt ?? existing.reviewDueAt;
    let status = existing.status;
    if (input.intent === "activate") { const result = connectionCanActivate({ ...gateValues, ownerId: existing.ownerId, reviewDueAt }); if (!result.allowed) throw new Error(result.reason!); status = "ACTIVE"; }
    if (input.intent === "pause") status = "PAUSED";
    if (input.intent === "revoke") status = "REVOKED";
    if (input.intent === "save-review" && existing.status !== "ACTIVE") status = "REVIEW_REQUIRED";
    await db.$transaction(async (tx) => {
      await tx.integrationConnection.update({ where: { id }, data: { ...gateValues, reviewDueAt, status } });
      if (status === "REVOKED") await tx.integrationCredential.updateMany({ where: { connectionId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: existing.locationId, userId: context.user.id, action: status === existing.status ? "UPDATE" : "STATUS_CHANGE", recordType: "IntegrationConnection", recordId: id, summary: `${input.intent.replaceAll("-", " ")} for integration ${existing.name}`, beforeValue: { status: existing.status }, afterValue: { status, reviewDueAt, completedGates: Object.values(gateValues).filter(Boolean).length } } });
    });
    return NextResponse.json({ ok: true, status });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not update the integration." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
