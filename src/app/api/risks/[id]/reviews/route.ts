import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { riskLevel, riskScopeWhere, riskScore } from "@/lib/risks";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id } = await params; const form = await request.formData(); const db = createDb();
  try {
    const risk = await db.risk.findFirst({ where: { id, ...riskScopeWhere(context), status: { not: "ARCHIVED" } } });
    if (!risk) return NextResponse.json({ error: "Risk not found." }, { status: 404 });
    const likelihood = Number(form.get("likelihood")); const impact = Number(form.get("impact")); const score = riskScore(likelihood, impact);
    const reviewDate = parseOptionalDate(form.get("reviewDate")); const nextReviewDate = parseOptionalDate(form.get("nextReviewDate")); const notes = String(form.get("notes") ?? "").trim();
    if (!reviewDate || !nextReviewDate || notes.length < 3) throw new Error("Enter the review dates and review notes.");
    await db.$transaction([
      db.riskReview.create({ data: { riskId: id, reviewedById: context.user.id, reviewDate, notes, likelihood, impact, score, level: riskLevel(score), controlsEffective: form.get("controlsEffective") === "true", nextReviewDate } }),
      db.risk.update({ where: { id }, data: { lastReviewDate: reviewDate, nextReviewDate, residualLikelihood: likelihood, residualImpact: impact, residualScore: score, residualLevel: riskLevel(score), status: risk.status === "OPEN" ? "MONITORING" : risk.status } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: risk.locationId, userId: context.user.id, action: "UPDATE", recordType: "RiskReview", recordId: id, summary: `Reviewed risk: ${risk.reference}`, afterValue: { score, level: riskLevel(score), nextReviewDate } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record review." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
