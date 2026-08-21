import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { riskScopeWhere, validateRiskClosure } from "@/lib/risks";
import { parseRiskInput } from "@/lib/risk-input";
import { syncRiskEvidence } from "@/lib/risk-evidence";
import { riskClosureEvidenceSummary } from "@/lib/risk-closure-evidence";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id } = await params; const db = createDb();
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json() as { intent?: string }; const risk = await db.risk.findFirst({ where: { id, ...riskScopeWhere(context) } });
      if (!risk) return NextResponse.json({ error: "Risk not found." }, { status: 404 });
      if (!["archive", "restore"].includes(body.intent ?? "")) throw new Error("Unknown risk action.");
      const archive = body.intent === "archive";
      const status=archive?"ARCHIVED":"OPEN";
      await db.$transaction(async(tx)=>{await tx.risk.update({ where: { id }, data: { status, archivedAt: archive ? new Date() : null } });await syncRiskEvidence(tx,{riskId:id,organisationId:risk.organisationId,locationId:risk.locationId,reference:risk.reference,title:risk.title,description:risk.description,category:risk.category,ownerId:risk.ownerId,createdById:risk.createdById,actorId:context.user.id,identifiedDate:risk.identifiedDate,nextReviewDate:risk.nextReviewDate,residualScore:risk.residualScore,residualLevel:risk.residualLevel,status,existingControls:risk.existingControls,controlEffectiveness:risk.controlEffectiveness});await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: risk.locationId, userId: context.user.id, action: archive ? "ARCHIVE" : "RESTORE", recordType: "Risk", recordId: id, summary: `${archive ? "Archived" : "Restored"} risk: ${risk.reference}` } })});
      return NextResponse.json({ ok: true });
    }
    const risk = await db.risk.findFirst({ where: { id, ...riskScopeWhere(context) }, include: { evidenceLinks: true } });
    if (!risk) return NextResponse.json({ error: "Risk not found." }, { status: 404 });
    const form = await request.formData();const input=parseRiskInput(form);const{title,locationId,ownerId,closureApprovedById}=input;
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");
    for (const userId of [ownerId, closureApprovedById].filter(Boolean) as string[]) if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId, status: "ACTIVE" } }))) throw new Error("Choose an active organisation member.");
    const evidenceIds = form.getAll("evidenceIds").map(String).filter(Boolean);
    for (const evidenceId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const unresolvedActionCount=input.status==="CLOSED"?await db.action.count({where:{organisationId:context.organisation.id,sourceType:"RISK",sourceRecordId:id,status:{notIn:["COMPLETED","CANCELLED","ARCHIVED"]}}}):0;
    const closureApproverId=input.status==="CLOSED"?(closureApprovedById??context.user.id):closureApprovedById,closureDate=input.status==="CLOSED"?(input.closureDate??new Date()):input.closureDate;
    const closureEvidence=await riskClosureEvidenceSummary(db,context,evidenceIds);
    validateRiskClosure({ status:input.status, level:input.residualLevel, residualScore:input.residualScore, toleranceScore:input.toleranceScore, rationale:input.closureRationale ?? undefined, ownerId, approverId: closureApproverId ?? undefined, actorId:context.user.id, closureDate, ...closureEvidence, unresolvedActionCount });
    const update = { ...input,closureApprovedById:closureApproverId,closureDate,status:input.status as never, archivedAt: input.status === "ARCHIVED" ? risk.archivedAt ?? new Date() : null };
    await db.$transaction(async (tx) => {
      await tx.risk.update({ where: { id }, data: { ...update, evidenceLinks: { deleteMany: {}, create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      await syncRiskEvidence(tx,{riskId:id,organisationId:context.organisation.id,locationId,reference:risk.reference,title,description:input.description,category:input.category,ownerId,createdById:risk.createdById,actorId:context.user.id,identifiedDate:input.identifiedDate,nextReviewDate:input.nextReviewDate,residualScore:input.residualScore,residualLevel:input.residualLevel,status:input.status,existingControls:input.existingControls,controlEffectiveness:input.controlEffectiveness});
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "Risk", recordId: id, summary: `Updated risk: ${risk.reference}`, beforeValue: { status: risk.status, residualScore: risk.residualScore }, afterValue: { status:input.status, residualScore:input.residualScore,targetScore:input.targetScore } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update risk." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
