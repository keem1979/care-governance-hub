import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { EVIDENCE_MAPPING_DECISIONS } from "@/lib/evidence-assurance";
import { inspectionScopeWhere } from "@/lib/inspection";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const sourceType = String(form.get("sourceType") ?? "");
  const sourceId = String(form.get("sourceId") ?? "");
  const requirementId = String(form.get("requirementId") ?? "");
  const decision = String(form.get("decision") ?? "");
  const rationale = String(form.get("rationale") ?? "").trim().slice(0, 2000);
  if (!["POLICY", "TEMPLATE"].includes(sourceType) || !EVIDENCE_MAPPING_DECISIONS.includes(decision as never) || rationale.length < 10) return NextResponse.json({ error: "Choose the controlled record, requirement and decision, then record the mapping rationale." }, { status: 400 });
  const db = createDb();
  try {
    const requirement = await db.complianceRequirement.findFirst({ where: { id: requirementId, ...inspectionScopeWhere(context) }, select: { id: true, title: true, locationId: true } });
    if (!requirement) return NextResponse.json({ error: "Requirement not found." }, { status: 404 });
    const reviewedAt = decision === "PENDING" ? null : new Date();
    const now = new Date();
    const record = await db.$transaction(async (tx) => {
      let mapped: { id: string; label: string };
      if (sourceType === "POLICY") {
        const policy = await tx.policy.findFirst({ where: { id: sourceId, organisationId: context.organisation.id, archivedAt: null }, select: { id: true, title: true } });
        if (!policy) throw new Error("Policy not found.");
        const mapping = await tx.policyRequirementMapping.upsert({ where: { policyId_requirementId: { policyId: sourceId, requirementId } }, create: { organisationId: context.organisation.id, policyId: sourceId, requirementId, decision: decision as never, rationale, mappedById: context.user.id, mappedAt: now, reviewedAt }, update: { decision: decision as never, rationale, mappedById: context.user.id, mappedAt: now, reviewedAt } });
        mapped = { id: mapping.id, label: policy.title };
      } else {
        const template = await tx.template.findFirst({ where: { id: sourceId, status: { not: "ARCHIVED" }, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] }, select: { id: true, title: true } });
        if (!template) throw new Error("Template not found.");
        const mapping = await tx.templateRequirementMapping.upsert({ where: { templateId_requirementId: { templateId: sourceId, requirementId } }, create: { organisationId: context.organisation.id, templateId: sourceId, requirementId, decision: decision as never, rationale, mappedById: context.user.id, mappedAt: now, reviewedAt }, update: { decision: decision as never, rationale, mappedById: context.user.id, mappedAt: now, reviewedAt } });
        mapped = { id: mapping.id, label: template.title };
      }
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: requirement.locationId, userId: context.user.id, action: "APPROVAL", recordType: `${sourceType}RequirementMapping`, recordId: mapped.id, summary: `Mapped ${mapped.label} to ${requirement.title}: ${decision.toLowerCase().replaceAll("_", " ")}`, afterValue: { sourceType, sourceId, requirementId, decision } } });
      return mapped;
    });
    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the controlled mapping." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
