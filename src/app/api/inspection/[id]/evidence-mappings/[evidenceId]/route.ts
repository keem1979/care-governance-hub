import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { EVIDENCE_MAPPING_DECISIONS } from "@/lib/evidence-assurance";
import { CQC_EVIDENCE_CATEGORIES } from "@/lib/inspection-framework";
import { inspectionScopeWhere } from "@/lib/inspection";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id, evidenceId } = await params;
  const form = await request.formData();
  const decision = String(form.get("decision") ?? "");
  const rationale = String(form.get("rationale") ?? "").trim().slice(0, 2000);
  const evidenceCategories = [...new Set(form.getAll("evidenceCategories").map(String))];
  if (!EVIDENCE_MAPPING_DECISIONS.includes(decision as never)) return NextResponse.json({ error: "Choose a valid suitability decision." }, { status: 400 });
  if (decision !== "PENDING" && rationale.length < 10) return NextResponse.json({ error: "Record why this evidence is or is not suitable for the requirement." }, { status: 400 });
  if (evidenceCategories.some((item) => !CQC_EVIDENCE_CATEGORIES.includes(item as never))) return NextResponse.json({ error: "Choose valid evidence categories." }, { status: 400 });
  const db = createDb();
  try {
    const requirement = await db.complianceRequirement.findFirst({ where: { id, ...inspectionScopeWhere(context), evidenceLinks: { some: { evidenceId } } }, select: { id: true, title: true, locationId: true } });
    if (!requirement) return NextResponse.json({ error: "Evidence mapping not found." }, { status: 404 });
    const reviewedAt = decision === "PENDING" ? null : new Date();
    await db.$transaction([
      db.complianceRequirementEvidence.update({ where: { requirementId_evidenceId: { requirementId: id, evidenceId } }, data: { decision: decision as never, rationale: rationale || null, evidenceCategories, mappedById: context.user.id, mappedAt: new Date(), reviewedAt } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: requirement.locationId, userId: context.user.id, action: "APPROVAL", recordType: "RequirementEvidenceMapping", recordId: `${id}:${evidenceId}`, summary: `Reviewed evidence suitability for ${requirement.title}: ${decision.toLowerCase().replaceAll("_", " ")}`, afterValue: { requirementId: id, evidenceId, decision, evidenceCategories } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not review the mapping." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
