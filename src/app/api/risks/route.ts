import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { makeRiskReference, REVIEW_FREQUENCIES, RISK_CATEGORIES, RISK_STATUSES, riskLevel, riskScore, validateRiskClosure } from "@/lib/risks";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData(); const db = createDb();
  try {
    const title = String(form.get("title") ?? "").trim(); const description = String(form.get("description") ?? "").trim();
    const category = String(form.get("category") ?? "Other"); const existingControls = String(form.get("existingControls") ?? "").trim();
    const locationId = String(form.get("locationId") ?? "") || null; const ownerId = String(form.get("ownerId") ?? "") || null;
    const likelihood = Number(form.get("likelihood")); const impact = Number(form.get("impact"));
    const residualLikelihood = Number(form.get("residualLikelihood")); const residualImpact = Number(form.get("residualImpact"));
    const initialScore = riskScore(likelihood, impact); const residualScore = riskScore(residualLikelihood, residualImpact);
    const status = String(form.get("status") ?? "OPEN"); const reviewFrequency = String(form.get("reviewFrequency") ?? "Quarterly");
    const nextReviewDate = parseOptionalDate(form.get("nextReviewDate")); const closureDate = parseOptionalDate(form.get("closureDate"));
    const closureRationale = String(form.get("closureRationale") ?? "").trim() || null;
    const closureApprovedById = String(form.get("closureApprovedById") ?? "") || null;
    if (title.length < 3 || description.length < 3 || existingControls.length < 3) throw new Error("Enter the risk title, description and existing controls.");
    if (!RISK_CATEGORIES.includes(category as never) || !RISK_STATUSES.includes(status as never) || !REVIEW_FREQUENCIES.includes(reviewFrequency as never)) throw new Error("Choose valid risk values.");
    if (!nextReviewDate) throw new Error("Choose the next review date.");
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");
    if (ownerId && !(await activeMember(db, context.organisation.id, ownerId))) throw new Error("Choose an active risk owner.");
    if (closureApprovedById && !(await activeMember(db, context.organisation.id, closureApprovedById))) throw new Error("Choose an active closure approver.");
    validateRiskClosure({ status, level: riskLevel(residualScore), rationale: closureRationale ?? undefined, approverId: closureApprovedById ?? undefined, closureDate });
    const evidenceIds = form.getAll("evidenceIds").map(String).filter(Boolean);
    for (const evidenceId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const reference = String(form.get("reference") ?? "").trim() || makeRiskReference();
    const risk = await db.$transaction(async (tx) => {
      const created = await tx.risk.create({ data: {
        organisationId: context.organisation.id, locationId, reference, title, description, category, existingControls,
        likelihood, impact, initialScore, initialLevel: riskLevel(initialScore), furtherControls: String(form.get("furtherControls") ?? "").trim() || null,
        ownerId, targetDate: parseOptionalDate(form.get("targetDate")), residualLikelihood, residualImpact, residualScore,
        residualLevel: riskLevel(residualScore), reviewFrequency, lastReviewDate: parseOptionalDate(form.get("lastReviewDate")),
        nextReviewDate, status: status as never, closureRationale, closureApprovedById, closureDate, createdById: context.user.id,
        evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) },
      } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "Risk", recordId: created.id, summary: `Added risk: ${reference} — ${title}`, afterValue: { status, initialScore, residualScore } } });
      return created;
    });
    return NextResponse.json({ id: risk.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add risk." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

async function activeMember(db: ReturnType<typeof createDb>, organisationId: string, userId: string) {
  return db.organisationMembership.findFirst({ where: { organisationId, userId, status: "ACTIVE" } });
}
