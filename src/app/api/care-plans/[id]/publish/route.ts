import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { carePlanScopeWhere, parseCarePlanSnapshot, validateCarePlanAssurance } from "@/lib/care-plans";
import { createDb } from "@/lib/db";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const context=await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);const{id}=await params;const db=createDb();
  try{
    if(context.role.key!==ROLE_KEYS.REGISTERED_MANAGER)throw new Error("Publishing a clinical care plan requires an authorised Registered Manager account.");
    const form=await request.formData(),versionId=String(form.get("versionId")??""),decision=String(form.get("decision")??"");
    const plan=await db.carePlan.findFirst({where:{id,...carePlanScopeWhere(context)}});if(!plan)return NextResponse.json({error:"Care plan not found."},{status:404});
    const version=await db.carePlanVersion.findFirst({where:{id:versionId,carePlanId:id,status:{in:["DRAFT","AWAITING_APPROVAL","APPROVED"]}},include:{changes:true}});if(!version)throw new Error("Choose the current proposed care-plan version.");
    const snapshot=parseCarePlanSnapshot(version.snapshot);validateCarePlanAssurance(snapshot,decision);
    if(plan.overallRisk==="CRITICAL"&&plan.linkedActionIds.length){const open=await db.action.count({where:{id:{in:plan.linkedActionIds},organisationId:context.organisation.id,priority:"CRITICAL",status:{notIn:["COMPLETED","CANCELLED","ARCHIVED"]}}});if(open&&decision==="APPROVE AND PUBLISH")throw new Error("Critical actions remain open. Use Approved With Actions with explicit interim controls or resolve them first.");}
    const publishedAt=new Date(),effectiveDate=version.effectiveDate??publishedAt;
    await db.$transaction(async(tx)=>{if(plan.currentVersionId&&plan.currentVersionId!==version.id)await tx.carePlanVersion.updateMany({where:{id:plan.currentVersionId,status:"PUBLISHED"},data:{status:"SUPERSEDED"}});await tx.carePlanVersion.update({where:{id:version.id},data:{status:"PUBLISHED",approvedById:context.user.id,approvedAt:publishedAt,publishedAt,effectiveDate,changes:{updateMany:{where:{approvalStatus:"PENDING"},data:{approvalStatus:"APPROVED",approvedById:context.user.id,approvedAt:publishedAt}}}}});await tx.carePlan.update({where:{id},data:{currentVersionId:version.id,currentVersionNumber:version.versionNumber,status:decision==="APPROVE WITH ACTIONS"?"ACTIVE_WITH_ACTIONS":"ACTIVE",effectiveDate,nextReviewDate:version.nextReviewDate,staffAcknowledgementRequired:version.acknowledgementRequired}});await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId:plan.locationId,userId:context.user.id,action:"APPROVAL",recordType:"CarePlan",recordId:id,summary:`Approved and published care plan ${plan.reference} version ${version.versionNumber}`,afterValue:{decision,version:version.versionNumber,changedSections:version.materialSections}}});});
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not publish the care plan."},{status:400});}finally{await db.$disconnect();}
}
