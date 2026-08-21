import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { providerControlApplies } from "@/lib/provider-controls";
import { riskScopeWhere } from "@/lib/risks";

const schema=z.discriminatedUnion("intent",[
 z.object({intent:z.literal("APPLY"),controlVersionId:z.string().uuid()}),
 z.object({intent:z.literal("LINK_EVIDENCE"),applicationId:z.string().uuid(),evidenceId:z.string().uuid(),role:z.enum(["CONTROL","EFFECTIVENESS"])}),
 z.object({intent:z.literal("ASSESS_EFFECTIVENESS"),applicationId:z.string().uuid(),outcome:z.enum(["NOT_TESTED","INEFFECTIVE","PARTIALLY_EFFECTIVE","EFFECTIVE","INSUFFICIENT_EVIDENCE"]),method:z.string().trim().min(3).max(1000),rationale:z.string().trim().min(8).max(2000),reviewDate:z.string().date(),nextReviewDate:z.string().date().nullable().optional()}),
 z.object({intent:z.literal("NO_LONGER_APPLICABLE"),applicationId:z.string().uuid(),rationale:z.string().trim().min(8).max(1000)})
]);

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const context=await requirePermission(PERMISSIONS.GOVERNANCE_EDIT),{id}=await params,db=createDb();try{const input=schema.parse(await request.json()),risk=await db.risk.findFirst({where:{id,...riskScopeWhere(context)}});if(!risk)return NextResponse.json({error:"Risk not found."},{status:404});
 if(input.intent==="APPLY"){
  const version=await db.providerControlVersion.findFirst({where:{id:input.controlVersionId,organisationId:context.organisation.id},include:{control:true,locations:true}});if(!version||!providerControlApplies({status:version.status,scopeType:version.scopeType,locationIds:version.locations.map(item=>item.locationId),riskLocationId:risk.locationId,categoryKeys:version.applicableRiskCategoryKeys,riskCategory:risk.category}))throw new Error("This approved Provider Control does not apply to the Risk scope or category.");
  const expectedEvidenceSnapshot={familyKeys:version.expectedEvidenceFamilyKeys,typeKeys:version.expectedEvidenceTypeKeys};
  const application=await db.$transaction(async tx=>{const item=await tx.riskControlApplication.create({data:{organisationId:context.organisation.id,riskId:id,controlVersionId:version.id,controlKeySnapshot:version.control.stableKey,versionNumberSnapshot:version.versionNumber,titleSnapshot:version.title,descriptionSnapshot:version.description,familySnapshot:version.family,expectedEvidenceSnapshot,effectivenessMethodSnapshot:version.expectedEffectivenessMethod,appliedById:context.user.id}});await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId:risk.locationId,userId:context.user.id,action:"UPDATE",recordType:"RiskControlApplication",recordId:item.id,summary:`Applied ${version.control.stableKey} v${version.versionNumber} to ${risk.reference}`,afterValue:{riskId:id,controlVersionId:version.id}}});return item});return NextResponse.json({id:application.id},{status:201});
 }
 const application=await db.riskControlApplication.findFirst({where:{id:input.applicationId,organisationId:context.organisation.id,riskId:id}});if(!application)throw new Error("Applied Control not found.");
 if(input.intent==="LINK_EVIDENCE"){
  const evidence=await db.evidence.findFirst({where:{id:input.evidenceId,...evidenceScopeWhere(context)}});if(!evidence)throw new Error("Evidence not found or outside your authorised scope.");
  await db.$transaction(async tx=>{await tx.riskControlEvidence.upsert({where:{applicationId_evidenceId_role:{applicationId:application.id,evidenceId:evidence.id,role:input.role}},create:{applicationId:application.id,evidenceId:evidence.id,role:input.role,linkedById:context.user.id},update:{}});await tx.riskEvidence.upsert({where:{riskId_evidenceId_role:{riskId:id,evidenceId:evidence.id,role:input.role}},create:{riskId:id,evidenceId:evidence.id,role:input.role},update:{}});await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId:risk.locationId,userId:context.user.id,action:"UPDATE",recordType:"RiskControlEvidence",recordId:application.id,summary:`Linked ${input.role.toLowerCase()} Evidence to ${risk.reference}`,afterValue:{evidenceId:evidence.id,role:input.role}}})});return NextResponse.json({ok:true});
 }
 if(input.intent==="ASSESS_EFFECTIVENESS"){
  if(input.outcome==="NOT_TESTED")return NextResponse.json({ok:true});const outcome=input.outcome;
  const review=await db.$transaction(async tx=>{const item=await tx.riskControlEffectivenessReview.create({data:{organisationId:context.organisation.id,applicationId:application.id,outcome,method:input.method,rationale:input.rationale,reviewDate:new Date(`${input.reviewDate}T12:00:00.000Z`),nextReviewDate:input.nextReviewDate?new Date(`${input.nextReviewDate}T12:00:00.000Z`):null,reviewerId:context.user.id}});await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId:risk.locationId,userId:context.user.id,action:"UPDATE",recordType:"RiskControlEffectivenessReview",recordId:item.id,summary:`Recorded Control effectiveness for ${risk.reference}: ${outcome}`,afterValue:{applicationId:application.id,outcome}}});return item});return NextResponse.json({id:review.id},{status:201});
 }
 await db.$transaction(async tx=>{await tx.riskControlApplication.update({where:{id:application.id},data:{status:"NO_LONGER_APPLICABLE",reviewReason:input.rationale,reviewRequiredAt:new Date()}});await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId:risk.locationId,userId:context.user.id,action:"UPDATE",recordType:"RiskControlApplication",recordId:application.id,summary:`Marked an applied Control no longer applicable to ${risk.reference}`,afterValue:{rationale:input.rationale}}})});return NextResponse.json({ok:true});
 }catch(error){const message=error instanceof Error?error.message:"Could not update the Risk Control.";return NextResponse.json({error:message},{status:message.includes("Unique constraint")?409:400})}finally{await db.$disconnect()}}
