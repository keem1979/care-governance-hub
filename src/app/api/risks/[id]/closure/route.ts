import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { riskScopeWhere } from "@/lib/risks";
import { evaluateRiskClosure, evaluateRiskClosureConditions, resolveCurrentClosureRule, resolveCurrentRiskFramework, stableRiskCategoryKey, strongestRecordedRiskLevel } from "@/lib/risk-framework";
import { riskClosureEvidenceSummary } from "@/lib/risk-closure-evidence";

type ClosureRequest={intent?:"propose"|"approve"|"reject"|"withdraw";rationale?:string};
const resolvedActionStatuses=["COMPLETED","CANCELLED","ARCHIVED"] as const;

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  // Closure is separately authorised by the effective policy below. Requiring
  // broad governance-edit here would prevent configured provider approvers
  // (for example a Nominated Individual with oversight-only access) from making
  // the narrow decision they are explicitly authorised to make.
  const context=await requirePermission(PERMISSIONS.GOVERNANCE_VIEW),{id}=await params,db=createDb();
  try{
    const body=await request.json() as ClosureRequest,intent=body.intent,rationale=body.rationale?.trim()??"";
    if(!intent||!["propose","approve","reject","withdraw"].includes(intent))throw new Error("Choose a valid closure action.");
    const risk=await db.risk.findFirst({where:{id,...riskScopeWhere(context)},include:{evidenceLinks:true,reviews:{orderBy:{reviewDate:"desc"},select:{controlsEffective:true,assuranceChecked:true,level:true}},closureProposals:{where:{status:"PENDING"},include:{approvals:true,evidenceLinks:true},orderBy:{proposedAt:"desc"},take:1}}});
    if(!risk)return NextResponse.json({error:"Risk not found."},{status:404});
    if(risk.status==="ARCHIVED")throw new Error("Restore the Risk before using the closure workflow.");
    const authorityLevel=strongestRecordedRiskLevel([risk.initialLevel,risk.residualLevel,...risk.reviews.map(review=>review.level)]);
    const [actions,framework,closure]=await Promise.all([
      db.action.findMany({where:{organisationId:context.organisation.id,sourceType:"RISK",sourceRecordId:id,status:{not:"ARCHIVED"}},select:{reference:true,status:true,_count:{select:{effectivenessReviews:true}}}}),
      resolveCurrentRiskFramework(db,context.organisation.id,risk.category),
      resolveCurrentClosureRule(db,context.organisation.id,authorityLevel,stableRiskCategoryKey(risk.category)),
    ]);
    const toleranceScore=framework?.toleranceScore??risk.toleranceScore,appetite=framework?.appetite??risk.appetite;
    const evidenceIds=risk.evidenceLinks.map(({evidenceId})=>evidenceId),evidence=await riskClosureEvidenceSummary(db,context,evidenceIds);
    const unresolvedActionCount=actions.filter(action=>!resolvedActionStatuses.includes(action.status as (typeof resolvedActionStatuses)[number])).length;
    const effectivenessReviewCount=actions.reduce((total,action)=>total+action._count.effectivenessReviews,0)+(risk.reviews[0]?.controlsEffective&&risk.reviews[0]?.assuranceChecked?1:0);
    const conditions={residualScore:risk.residualScore,toleranceScore,supportingEvidenceCount:evidence.supportingEvidenceCount,verifiedCurrentEvidenceCount:evidence.verifiedCurrentEvidenceCount,unresolvedActionCount,effectivenessReviewCount,ownerId:risk.ownerId};
    const pending=risk.closureProposals[0];

    if(intent==="propose"){
      if(["CLOSED","CLOSURE_PROPOSED"].includes(risk.status)||pending)throw new Error("This Risk already has an active or completed closure process.");
      if(rationale.length<12)throw new Error("Explain why sufficient assurance now exists to propose closure.");
      if(!closure.rule.proposerRoleKeys.includes(context.role.key))return NextResponse.json({error:"Your current role is not authorised to propose closure under the applicable policy."},{status:403});
      const checks=evaluateRiskClosureConditions(closure.rule,conditions),outstanding=checks.filter(check=>!check.met).map(check=>check.reason);
      if(outstanding.length)return NextResponse.json({error:"The Risk is not ready for a closure proposal.",outstanding},{status:409});
      await db.$transaction(async tx=>{
        const proposal=await tx.riskClosureProposal.create({data:{organisationId:risk.organisationId,locationId:risk.locationId,riskId:risk.id,frameworkVersionId:framework?.frameworkVersionId??risk.riskFrameworkVersionId,policyVersionId:closure.policyVersion?.id??null,previousRiskStatus:risk.status,residualScoreSnapshot:risk.residualScore,toleranceScoreSnapshot:toleranceScore,appetiteSnapshot:appetite,linkedActionReferences:actions.map(action=>action.reference),rationale,proposedById:context.user.id,proposedRoleKeySnapshot:context.role.key,evidenceLinks:{create:evidenceIds.map(evidenceId=>({evidenceId}))}}});
        await tx.risk.update({where:{id:risk.id},data:{status:"CLOSURE_PROPOSED"}});
        await tx.activityLog.create({data:{organisationId:risk.organisationId,locationId:risk.locationId,userId:context.user.id,action:"CREATE",recordType:"RiskClosureProposal",recordId:proposal.id,summary:`Proposed closure of risk: ${risk.reference}`,afterValue:{policyVersion:closure.policyVersion?.versionNumber??"legacy fallback",residualScore:risk.residualScore,toleranceScore,actionReferences:actions.map(action=>action.reference),evidenceIds,role:context.role.key}}});
      });
      return NextResponse.json({ok:true});
    }

    if(!pending)return NextResponse.json({error:"No pending closure proposal was found."},{status:409});
    if(intent==="withdraw"){
      if(pending.proposedById!==context.user.id)return NextResponse.json({error:"Only the person who proposed closure may withdraw this proposal."},{status:403});
      if(rationale.length<8)throw new Error("Explain why this closure proposal is being withdrawn.");
      const withdrawnAt=new Date();
      await db.$transaction(async tx=>{await tx.riskClosureProposal.update({where:{id:pending.id},data:{status:"WITHDRAWN",resolvedAt:withdrawnAt,withdrawnById:context.user.id,withdrawnAt,withdrawalReason:rationale}});await tx.risk.update({where:{id:risk.id},data:{status:pending.previousRiskStatus}});await tx.activityLog.create({data:{organisationId:risk.organisationId,locationId:risk.locationId,userId:context.user.id,action:"UPDATE",recordType:"RiskClosureProposal",recordId:pending.id,summary:`Withdrew closure proposal for risk: ${risk.reference}`,afterValue:{status:"WITHDRAWN",withdrawnById:context.user.id,withdrawnAt,rationale}}});});
      return NextResponse.json({ok:true});
    }

    if(!closure.rule.approverRoleKeys.includes(context.role.key))return NextResponse.json({error:"Your current role is not authorised to decide this closure proposal."},{status:403});
    if((pending.policyVersionId??null)!==(closure.policyVersion?.id??null))return NextResponse.json({error:"The organisation closure policy changed after this proposal was raised. Withdraw and re-propose under the current policy."},{status:409});
    if(pending.approvals.some(approval=>approval.approverId===context.user.id))return NextResponse.json({error:"You have already recorded a decision on this proposal."},{status:409});
    if(intent==="reject"){
      if(rationale.length<8)throw new Error("Explain why closure is not approved and what remains required.");
      await db.$transaction(async tx=>{await tx.riskClosureApproval.create({data:{organisationId:risk.organisationId,locationId:risk.locationId,riskId:risk.id,proposalId:pending.id,approverId:context.user.id,membershipId:context.membershipId,policyVersionId:closure.policyVersion?.id??null,decision:"REJECTED",roleKeySnapshot:context.role.key,authoritySnapshot:`${authorityLevel}/${risk.categoryKey??"legacy"}; ${closure.rule.requiredApprovalCount} approval(s) required`,rationale}});await tx.riskClosureProposal.update({where:{id:pending.id},data:{status:"REJECTED",resolvedAt:new Date()}});await tx.risk.update({where:{id:risk.id},data:{status:pending.previousRiskStatus}});await tx.activityLog.create({data:{organisationId:risk.organisationId,locationId:risk.locationId,userId:context.user.id,action:"STATUS_CHANGE",recordType:"RiskClosureProposal",recordId:pending.id,summary:`Rejected closure proposal for risk: ${risk.reference}`,afterValue:{role:context.role.key,rationale}}});});
      return NextResponse.json({ok:true});
    }

    if(rationale.length<8)throw new Error("Record the assurance rationale for your approval.");
    const existingApprovalCount=pending.approvals.filter(approval=>approval.decision==="APPROVED").length;
    const evaluation=evaluateRiskClosure(closure.rule,{...conditions,actorRoleKey:context.role.key,actorId:context.user.id,proposerId:pending.proposedById,approvalCount:existingApprovalCount+1});
    const actorChecks=evaluation.checks.filter(check=>["role","self"].includes(check.key)&&!check.met);
    if(actorChecks.length)return NextResponse.json({error:actorChecks[0].reason},{status:403});
    const conditionFailures=evaluation.checks.filter(check=>!["role","self"].includes(check.key)&&!check.met);
    if(conditionFailures.length)return NextResponse.json({error:"Closure conditions changed after the proposal.",outstanding:conditionFailures.map(check=>check.reason)},{status:409});
    const approvalResult=await db.$transaction(async tx=>{
      await tx.riskClosureApproval.create({data:{organisationId:risk.organisationId,locationId:risk.locationId,riskId:risk.id,proposalId:pending.id,approverId:context.user.id,membershipId:context.membershipId,policyVersionId:closure.policyVersion?.id??null,decision:"APPROVED",roleKeySnapshot:context.role.key,authoritySnapshot:`${authorityLevel}/${risk.categoryKey??"legacy"}; approval ${existingApprovalCount+1} of ${closure.rule.requiredApprovalCount}`,rationale}});
      const actualApprovalCount=await tx.riskClosureApproval.count({where:{proposalId:pending.id,decision:"APPROVED"}}),closed=actualApprovalCount>=closure.rule.requiredApprovalCount;
      if(closed){await tx.riskClosureProposal.update({where:{id:pending.id},data:{status:"APPROVED",resolvedAt:new Date()}});await tx.risk.update({where:{id:risk.id},data:{status:"CLOSED",closureRationale:pending.rationale,closureApprovedById:context.user.id,closureDate:new Date(),closurePolicyVersionId:closure.policyVersion?.id??null,closureToleranceSnapshot:toleranceScore,closureAppetiteSnapshot:appetite}});}
      await tx.activityLog.create({data:{organisationId:risk.organisationId,locationId:risk.locationId,userId:context.user.id,action:"APPROVAL",recordType:"RiskClosureProposal",recordId:pending.id,summary:`${closed?"Approved and closed":"Approved"} risk closure: ${risk.reference}`,afterValue:{role:context.role.key,approvalNumber:actualApprovalCount,requiredApprovals:closure.rule.requiredApprovalCount,closed,policyVersion:closure.policyVersion?.versionNumber??"legacy fallback"}}});
      return{closed,actualApprovalCount};
    },{isolationLevel:"Serializable"});
    return NextResponse.json({ok:true,closed:approvalResult.closed,approvalsRemaining:Math.max(0,closure.rule.requiredApprovalCount-approvalResult.actualApprovalCount)});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not process Risk closure."},{status:400})}finally{await db.$disconnect()}
}
