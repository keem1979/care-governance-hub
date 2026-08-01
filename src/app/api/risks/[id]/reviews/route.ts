import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { riskLevel, riskScopeWhere, riskScore } from "@/lib/risks";
import { syncRiskEvidence } from "@/lib/risk-evidence";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id } = await params; const form = await request.formData(); const db = createDb();
  try {
    const risk = await db.risk.findFirst({ where: { id, ...riskScopeWhere(context), status: { not: "ARCHIVED" } } });
    if (!risk) return NextResponse.json({ error: "Risk not found." }, { status: 404 });
    const likelihood = Number(form.get("likelihood")); const impact = Number(form.get("impact")); const score = riskScore(likelihood, impact);
    const reviewDate = parseOptionalDate(form.get("reviewDate")); const nextReviewDate = parseOptionalDate(form.get("nextReviewDate")); const notes = String(form.get("notes") ?? "").trim();
    const controlChanges=String(form.get("controlChanges")??"").trim()||null,assuranceChecked=String(form.get("assuranceChecked")??"").trim(),trend=String(form.get("trend")??"STABLE"),decision=String(form.get("decision")??"CONTINUE_MONITORING"),escalated=form.get("escalated")==="true";
    if (!reviewDate || !nextReviewDate || notes.length < 10) throw new Error("Enter the review dates and a clear review conclusion.");
    if(nextReviewDate<=reviewDate)throw new Error("The next review date must be after this review date.");
    if(assuranceChecked.length<3)throw new Error("Record the evidence used to test whether the controls are working.");
    if(!["IMPROVING","STABLE","DETERIORATING"].includes(trend)||!["CONTINUE_MONITORING","CHANGE_CONTROLS","ESCALATE","ACCEPT","CLOSE"].includes(decision))throw new Error("Choose a valid trend and management decision.");
    if(decision==="ACCEPT"&&!risk.acceptanceRationale)throw new Error("Record an acceptance rationale in the risk assessment before accepting this risk.");
    const status=decision==="ACCEPT"?"ACCEPTED":risk.status==="OPEN"?"MONITORING":risk.status;
    await db.$transaction(async(tx)=>{
      await tx.riskReview.create({ data: { riskId: id, reviewedById: context.user.id, reviewDate, notes, likelihood, impact, score, level: riskLevel(score), controlsEffective: form.get("controlsEffective") === "true",controlChanges,assuranceChecked,trend,decision,escalated:escalated||decision==="ESCALATE", nextReviewDate } });
      await tx.risk.update({ where: { id }, data: { lastReviewDate: reviewDate, nextReviewDate, residualLikelihood: likelihood, residualImpact: impact, residualScore: score, residualLevel: riskLevel(score), status } });
      await syncRiskEvidence(tx,{riskId:id,organisationId:risk.organisationId,locationId:risk.locationId,reference:risk.reference,title:risk.title,description:risk.description,category:risk.category,ownerId:risk.ownerId,createdById:risk.createdById,actorId:context.user.id,identifiedDate:risk.identifiedDate,nextReviewDate,residualScore:score,residualLevel:riskLevel(score),status,existingControls:risk.existingControls,controlEffectiveness:risk.controlEffectiveness});
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: risk.locationId, userId: context.user.id, action: "UPDATE", recordType: "RiskReview", recordId: id, summary: `Reviewed risk: ${risk.reference}`, afterValue: { score, level: riskLevel(score),trend,decision,escalated,nextReviewDate } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record review." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
