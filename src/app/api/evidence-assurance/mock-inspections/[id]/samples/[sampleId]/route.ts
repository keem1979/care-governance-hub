import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";

const OUTCOMES = ["NOT_TESTED", "ASSURED", "PARTIALLY_ASSURED", "GAP", "NOT_APPLICABLE"];
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; sampleId: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id, sampleId } = await params; const form = await request.formData();
  const outcome = String(form.get("outcome") ?? ""), observation = value(form, "observation"), peopleExperience = value(form, "peopleExperience"), staffFeedback = value(form, "staffFeedback"), finding = value(form, "finding");
  const sampledEvidenceIds = [...new Set(form.getAll("sampledEvidenceIds").map(String).filter(Boolean))];
  if (!OUTCOMES.includes(outcome) || (outcome !== "NOT_TESTED" && observation.length < 10) || (outcome === "GAP" && finding.length < 10)) return NextResponse.json({ error: "Record the tested outcome, observation and any identified gap." }, { status: 400 });
  const db = createDb();
  try {
    const sample = await db.mockInspectionSample.findFirst({ where: { id: sampleId, mockInspectionId: id, mockInspection: { organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }) } }, include: { mockInspection: true, requirement: { select: { title: true } } } });
    if (!sample) return NextResponse.json({ error: "Mock-inspection sample not found." }, { status: 404 });
    const available = await db.evidence.count({ where: { id: { in: sampledEvidenceIds }, ...evidenceScopeWhere(context), ...(sample.mockInspection.locationId ? { OR: [{ locationId: null }, { locationId: sample.mockInspection.locationId }] } : {}) } });
    if (available !== sampledEvidenceIds.length) return NextResponse.json({ error: "One or more sampled evidence records are unavailable." }, { status: 400 });
    const reviewedAt = outcome === "NOT_TESTED" ? null : new Date();
    await db.$transaction(async (tx) => {
      await tx.mockInspectionSample.update({ where: { id: sampleId }, data: { outcome: outcome as never, sampledEvidenceIds, observation: observation || null, peopleExperience: peopleExperience || null, staffFeedback: staffFeedback || null, finding: finding || null, reviewedById: reviewedAt ? context.user.id : null, reviewedAt } });
      const remaining = await tx.mockInspectionSample.count({ where: { mockInspectionId: id, outcome: "NOT_TESTED", id: { not: sampleId } } });
      await tx.mockInspection.update({ where: { id }, data: { status: remaining || outcome === "NOT_TESTED" ? "IN_PROGRESS" : "AWAITING_REVIEW", startedAt: sample.mockInspection.startedAt ?? new Date() } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: sample.mockInspection.locationId, userId: context.user.id, action: "UPDATE", recordType: "MockInspectionSample", recordId: sampleId, summary: `Mock inspection sample ${sample.requirement.title}: ${outcome.toLowerCase().replaceAll("_", " ")}`, afterValue: { outcome, sampledEvidenceIds } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record the sample." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function value(form: FormData, key: string) { return String(form.get(key) ?? "").trim().slice(0, 3000); }
