import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { REVIEW_FREQUENCIES, RISK_CATEGORIES, RISK_STATUSES, riskLevel, riskScopeWhere, riskScore, validateRiskClosure } from "@/lib/risks";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id } = await params; const db = createDb();
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json() as { intent?: string }; const risk = await db.risk.findFirst({ where: { id, ...riskScopeWhere(context) } });
      if (!risk) return NextResponse.json({ error: "Risk not found." }, { status: 404 });
      if (!["archive", "restore"].includes(body.intent ?? "")) throw new Error("Unknown risk action.");
      const archive = body.intent === "archive";
      await db.$transaction([
        db.risk.update({ where: { id }, data: { status: archive ? "ARCHIVED" : "OPEN", archivedAt: archive ? new Date() : null } }),
        db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: risk.locationId, userId: context.user.id, action: archive ? "ARCHIVE" : "RESTORE", recordType: "Risk", recordId: id, summary: `${archive ? "Archived" : "Restored"} risk: ${risk.reference}` } }),
      ]);
      return NextResponse.json({ ok: true });
    }
    const risk = await db.risk.findFirst({ where: { id, ...riskScopeWhere(context) }, include: { evidenceLinks: true } });
    if (!risk) return NextResponse.json({ error: "Risk not found." }, { status: 404 });
    const form = await request.formData(); const title = String(form.get("title") ?? "").trim(); const description = String(form.get("description") ?? "").trim();
    const category = String(form.get("category") ?? "Other"); const existingControls = String(form.get("existingControls") ?? "").trim();
    const locationId = String(form.get("locationId") ?? "") || null; const ownerId = String(form.get("ownerId") ?? "") || null;
    const likelihood = Number(form.get("likelihood")); const impact = Number(form.get("impact"));
    const residualLikelihood = Number(form.get("residualLikelihood")); const residualImpact = Number(form.get("residualImpact"));
    const initialScore = riskScore(likelihood, impact); const residualScore = riskScore(residualLikelihood, residualImpact);
    const status = String(form.get("status") ?? "OPEN"); const reviewFrequency = String(form.get("reviewFrequency") ?? "Quarterly");
    const nextReviewDate = parseOptionalDate(form.get("nextReviewDate")); const closureDate = parseOptionalDate(form.get("closureDate"));
    const closureRationale = String(form.get("closureRationale") ?? "").trim() || null; const closureApprovedById = String(form.get("closureApprovedById") ?? "") || null;
    if (title.length < 3 || description.length < 3 || existingControls.length < 3) throw new Error("Enter the risk title, description and existing controls.");
    if (!RISK_CATEGORIES.includes(category as never) || !RISK_STATUSES.includes(status as never) || !REVIEW_FREQUENCIES.includes(reviewFrequency as never)) throw new Error("Choose valid risk values.");
    if (!nextReviewDate) throw new Error("Choose the next review date.");
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");
    for (const userId of [ownerId, closureApprovedById].filter(Boolean) as string[]) if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId, status: "ACTIVE" } }))) throw new Error("Choose an active organisation member.");
    validateRiskClosure({ status, level: riskLevel(residualScore), rationale: closureRationale ?? undefined, approverId: closureApprovedById ?? undefined, closureDate });
    const evidenceIds = form.getAll("evidenceIds").map(String).filter(Boolean);
    for (const evidenceId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const update = { title, description, category, locationId, existingControls, likelihood, impact, initialScore, initialLevel: riskLevel(initialScore), furtherControls: String(form.get("furtherControls") ?? "").trim() || null, ownerId, targetDate: parseOptionalDate(form.get("targetDate")), residualLikelihood, residualImpact, residualScore, residualLevel: riskLevel(residualScore), reviewFrequency, lastReviewDate: parseOptionalDate(form.get("lastReviewDate")), nextReviewDate, status: status as never, closureRationale, closureApprovedById, closureDate, archivedAt: status === "ARCHIVED" ? risk.archivedAt ?? new Date() : null };
    await db.$transaction(async (tx) => {
      await tx.risk.update({ where: { id }, data: { ...update, evidenceLinks: { deleteMany: {}, create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "Risk", recordId: id, summary: `Updated risk: ${risk.reference}`, beforeValue: { status: risk.status, residualScore: risk.residualScore }, afterValue: { status, residualScore } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update risk." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
