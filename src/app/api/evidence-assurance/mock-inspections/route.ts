import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { inspectionScopeWhere } from "@/lib/inspection";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const form = await request.formData();
  const title = text(form, "title", 180), scope = text(form, "scope", 2000), frameworkLabel = text(form, "frameworkLabel", 180), leadId = text(form, "leadId", 60), locationId = text(form, "locationId", 60) || null, plannedAt = parseOptionalDate(form.get("plannedAt"));
  const requirementIds = [...new Set(form.getAll("requirementIds").map(String).filter(Boolean))];
  if (title.length < 3 || scope.length < 10 || frameworkLabel.length < 3 || !plannedAt || !requirementIds.length) return NextResponse.json({ error: "Record the inspection scope, framework, date, lead and at least one sampled requirement." }, { status: 400 });
  if (locationId && !context.locations.some((item) => item.id === locationId)) return NextResponse.json({ error: "Choose an authorised location." }, { status: 400 });
  const db = createDb();
  try {
    const [lead, requirements] = await Promise.all([
      db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: leadId, status: "ACTIVE", ...(locationId ? { OR: [{ allLocations: true }, { locations: { some: { locationId } } }] } : {}) } }),
      db.complianceRequirement.findMany({ where: { ...inspectionScopeWhere(context), id: { in: requirementIds }, ...(locationId ? { OR: [{ locationId: null }, { locationId }] } : {}) }, select: { id: true } }),
    ]);
    if (!lead || requirements.length !== requirementIds.length) return NextResponse.json({ error: "Choose an active lead and requirements within the inspection scope." }, { status: 400 });
    const created = await db.$transaction(async (tx) => {
      const inspection = await tx.mockInspection.create({ data: { organisationId: context.organisation.id, locationId, title, scope, frameworkLabel, plannedAt, leadId, createdById: context.user.id, samples: { create: requirementIds.map((complianceRequirementId) => ({ complianceRequirementId })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "MockInspection", recordId: inspection.id, summary: `Planned mock inspection: ${title}`, afterValue: { plannedAt, frameworkLabel, requirementIds } } });
      return inspection;
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not plan the mock inspection." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string, max: number) { return String(form.get(key) ?? "").trim().slice(0, max); }
