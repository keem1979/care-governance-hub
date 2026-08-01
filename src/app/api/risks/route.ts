import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { makeRiskReference, validateRiskClosure } from "@/lib/risks";
import { parseRiskInput } from "@/lib/risk-input";
import { syncRiskEvidence } from "@/lib/risk-evidence";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData(); const db = createDb();
  try {
    const input=parseRiskInput(form);const{title,locationId,ownerId,closureApprovedById}=input;
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");
    if (ownerId && !(await activeMember(db, context.organisation.id, ownerId))) throw new Error("Choose an active risk owner.");
    if (closureApprovedById && !(await activeMember(db, context.organisation.id, closureApprovedById))) throw new Error("Choose an active closure approver.");
    validateRiskClosure({ status:input.status, level:input.residualLevel, rationale:input.closureRationale ?? undefined, approverId: closureApprovedById ?? undefined, closureDate:input.closureDate });
    const evidenceIds = form.getAll("evidenceIds").map(String).filter(Boolean);
    for (const evidenceId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const reference = String(form.get("reference") ?? "").trim() || makeRiskReference();
    const risk = await db.$transaction(async (tx) => {
      const created = await tx.risk.create({ data: {
        organisationId: context.organisation.id,reference,...input,status:input.status as never,createdById: context.user.id,
        evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) },
      } });
      await syncRiskEvidence(tx,{riskId:created.id,organisationId:context.organisation.id,locationId,reference,title,description:input.description,category:input.category,ownerId,createdById:context.user.id,actorId:context.user.id,identifiedDate:input.identifiedDate,nextReviewDate:input.nextReviewDate,residualScore:input.residualScore,residualLevel:input.residualLevel,status:input.status,existingControls:input.existingControls,controlEffectiveness:input.controlEffectiveness});
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "Risk", recordId: created.id, summary: `Added risk: ${reference} — ${title}`, afterValue: { status:input.status, initialScore:input.initialScore, residualScore:input.residualScore,targetScore:input.targetScore } } });
      return created;
    });
    return NextResponse.json({ id: risk.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add risk." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

async function activeMember(db: ReturnType<typeof createDb>, organisationId: string, userId: string) {
  return db.organisationMembership.findFirst({ where: { organisationId, userId, status: "ACTIVE" } });
}
