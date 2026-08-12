import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { CQC_KEY_QUESTIONS, splitEvidenceExamples } from "@/lib/inspection";
import { CQC_EVIDENCE_CATEGORIES, INSPECTION_FRAMEWORK_SOURCE, INSPECTION_FRAMEWORK_VERSION } from "@/lib/inspection-framework";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { registerScopeWhere } from "@/lib/registers";

const DECISIONS=["NOT_REVIEWED","ASSURED","PARTIALLY_ASSURED","NOT_ASSURED","NOT_APPLICABLE"];
export async function POST(request: Request) {
  const context=await requirePermission(PERMISSIONS.GOVERNANCE_EDIT),form=await request.formData(),db=createDb();
  try{
    const title=text(form,"title"),explanation=text(form,"explanation"),keyQuestion=text(form,"keyQuestion"),locationId=text(form,"locationId")||null,ownerId=text(form,"ownerId")||null;
    if(title.length<3||explanation.length<10)throw new Error("Enter the requirement title and explanation.");
    if(!CQC_KEY_QUESTIONS.includes(keyQuestion as never))throw new Error("Choose a valid key question.");
    if(locationId&&!context.locations.some(({id})=>id===locationId))throw new Error("Choose an authorised location.");
    if(ownerId&&!(await db.organisationMembership.findFirst({where:{organisationId:context.organisation.id,userId:ownerId,status:"ACTIVE"}})))throw new Error("Choose an active owner.");
    const links=await validatedLinks(db,context,form,locationId),rm=rmFields(form,context.user.id);
    const created=await db.$transaction(async(tx)=>{const item=await tx.complianceRequirement.create({data:{organisationId:context.organisation.id,locationId,keyQuestion:keyQuestion as never,qualityStatement:optional(form,"qualityStatement"),title,explanation,evidenceExamples:splitEvidenceExamples(form.get("evidenceExamples")),ownerId,reviewDate:parseOptionalDate(form.get("reviewDate")),confidenceNote:optional(form,"confidenceNote"),frameworkVersion:INSPECTION_FRAMEWORK_VERSION,frameworkSourceUrl:INSPECTION_FRAMEWORK_SOURCE,expectedEvidenceCategories:[...CQC_EVIDENCE_CATEGORIES],...rm,createdById:context.user.id,evidenceLinks:{create:links.evidenceIds.map(evidenceId=>({evidenceId}))},auditLinks:{create:links.auditIds.map(auditId=>({auditId}))},registerLinks:{create:links.registerEntryIds.map(registerEntryId=>({registerEntryId}))},actionLinks:{create:links.actionIds.map(actionId=>({actionId}))}}});await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId,userId:context.user.id,action:"CREATE",recordType:"ComplianceRequirement",recordId:item.id,summary:`Created local inspection requirement: ${title}`,afterValue:{keyQuestion,managementDecision:rm.managementDecision,signedOff:Boolean(rm.signedOffAt)}}});return item});
    return NextResponse.json({id:created.id},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not create requirement."},{status:400})}finally{await db.$disconnect()}
}
async function validatedLinks(db:ReturnType<typeof createDb>,context:Awaited<ReturnType<typeof requirePermission>>,form:FormData,requirementLocationId:string|null){const evidenceIds=unique(form.getAll("evidenceIds")),auditIds=unique(form.getAll("auditIds")),registerEntryIds=unique(form.getAll("registerEntryIds")),actionIds=unique(form.getAll("actionIds"));const[evidence,audits,registers,actions]=await Promise.all([db.evidence.findMany({where:{id:{in:evidenceIds},...evidenceScopeWhere(context)},select:{id:true,locationId:true}}),db.audit.findMany({where:{id:{in:auditIds},...auditScopeWhere(context)},select:{id:true,locationId:true}}),db.registerEntry.findMany({where:{id:{in:registerEntryIds},...registerScopeWhere(context)},select:{id:true,locationId:true}}),db.action.findMany({where:{id:{in:actionIds},...actionScopeWhere(context)},select:{id:true,locationId:true}})]);if(evidence.length!==evidenceIds.length||audits.length!==auditIds.length||registers.length!==registerEntryIds.length||actions.length!==actionIds.length)throw new Error("One or more linked records are unavailable.");if(requirementLocationId&&[...evidence,...audits,...registers,...actions].some(x=>x.locationId&&x.locationId!==requirementLocationId))throw new Error("A location requirement can only use organisation-wide records or records from the same location.");return{evidenceIds,auditIds,registerEntryIds,actionIds}}
function rmFields(form:FormData,userId:string){const managementDecision=text(form,"managementDecision")||"NOT_REVIEWED";if(!DECISIONS.includes(managementDecision))throw new Error("Choose a valid management decision.");const coveredEvidenceCategories=unique(form.getAll("coveredEvidenceCategories"));if(coveredEvidenceCategories.some(x=>!CQC_EVIDENCE_CATEGORIES.includes(x as never)))throw new Error("Choose valid CQC evidence categories.");const reviewed=managementDecision!=="NOT_REVIEWED",signed=form.get("signedOff")==="true";if(signed&&!reviewed)throw new Error("Record an RM management decision before sign-off.");return{coveredEvidenceCategories,strengths:optional(form,"strengths"),areasForImprovement:optional(form,"areasForImprovement"),impactOnPeople:optional(form,"impactOnPeople"),managementDecision:managementDecision as never,reviewedById:reviewed?userId:null,reviewedAt:reviewed?new Date():null,signedOffById:signed?userId:null,signedOffAt:signed?new Date():null}}
function unique(values:FormDataEntryValue[]){return[...new Set(values.map(String).filter(Boolean))]}
function text(form:FormData,name:string){return String(form.get(name)??"").trim()}
function optional(form:FormData,name:string){return text(form,name)||null}
export{validatedLinks,rmFields};
