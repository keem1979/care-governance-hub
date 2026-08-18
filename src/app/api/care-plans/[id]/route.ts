import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/dal";
import { ensureCarePlanActions } from "@/lib/care-plan-actions";
import { CARE_PLAN_SCHEMA_VERSION, carePlanScopeWhere, compareCarePlanSnapshots, materialSectionLabels, parseCarePlanSnapshot, validateCarePlan } from "@/lib/care-plans";
import { clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { syncMaterialChangeRecords } from "@/lib/material-changes";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id } = await params; const form = await request.formData(); const db = createDb();
  try {
    const plan = await db.carePlan.findFirst({ where: { id, ...carePlanScopeWhere(context) }, include: { versions: { orderBy: { versionNumber: "desc" }, take: 2 } } });
    if (!plan) return NextResponse.json({ error: "Care plan not found." }, { status: 404 });
    const data = fields(form), snapshot = parseSnapshot(form), evidenceIds = unique(form,"evidenceIds"), staffIds = unique(form,"staffIds");
    validateCarePlan({ snapshot, clientId: data.clientId, locationId: data.locationId, careCoordinatorId: data.careCoordinatorId, registeredManagerId: data.registeredManagerId, nextReviewDate: data.nextReviewDate });
    await validateLinks(db,context,{...data,evidenceIds,staffIds});
    const live = plan.currentVersionId ? await db.carePlanVersion.findUnique({ where: { id: plan.currentVersionId } }) : null;
    const working = plan.versions.find((version)=>version.status!=="PUBLISHED"&&version.status!=="SUPERSEDED");
    const baseSnapshot = parseCarePlanSnapshot(live?.snapshot ?? {});
    const changes = compareCarePlanSnapshots(baseSnapshot,snapshot,{reason:data.reason,riskImpact:data.overallRisk as never,source:"Quick care-plan update"});
    const versionNumber = working?.versionNumber ?? Math.max(plan.currentVersionNumber,live?.versionNumber??0)+1;
    await db.$transaction(async(tx)=>{
      const version = working ? await tx.carePlanVersion.update({where:{id:working.id},data:{snapshot:snapshot as Prisma.InputJsonValue,changeSummary:{unchanged:15-changes.length,changed:changes.length} as Prisma.InputJsonValue,reason:data.reason,nextReviewDate:date(data.nextReviewDate),materialSections:materialSectionLabels(changes),acknowledgementRequired:section(snapshot,"implementation").acknowledgementRequired==="Yes",status:"AWAITING_APPROVAL",evidenceLinks:{deleteMany:{},create:evidenceIds.map((evidenceId)=>({evidenceId}))}}}) : await tx.carePlanVersion.create({data:{carePlanId:id,versionNumber,status:"AWAITING_APPROVAL",schemaVersion:CARE_PLAN_SCHEMA_VERSION,snapshot:snapshot as Prisma.InputJsonValue,changeSummary:{unchanged:15-changes.length,changed:changes.length} as Prisma.InputJsonValue,reason:data.reason,basedOnVersionId:live?.id,nextReviewDate:date(data.nextReviewDate),materialSections:materialSectionLabels(changes),acknowledgementRequired:section(snapshot,"implementation").acknowledgementRequired==="Yes",createdById:context.user.id,evidenceLinks:{create:evidenceIds.map((evidenceId)=>({evidenceId}))}}});
      await tx.carePlanChange.deleteMany({where:{versionId:version.id}});
      if(changes.length)await tx.carePlanChange.createMany({data:changes.map((change)=>({versionId:version.id,sectionKey:change.sectionKey,fieldPath:change.fieldPath,changeType:change.changeType,previousValue:(change.previousValue??null) as Prisma.InputJsonValue,proposedValue:(change.proposedValue??null) as Prisma.InputJsonValue,reason:change.reason,riskImpact:change.riskImpact,source:change.source,reviewerId:context.user.id}))});
      await syncMaterialChangeRecords(tx,{organisationId:context.organisation.id,locationId:data.locationId,carePlanId:id,carePlanVersionId:version.id,clientId:data.clientId!,actorId:context.user.id});
      const linkedActionIds=await ensureCarePlanActions(tx,{carePlanId:id,organisationId:context.organisation.id,locationId:data.locationId,clientId:data.clientId!,ownerId:data.careCoordinatorId!,actorId:context.user.id,reference:plan.reference,snapshot,existingIds:plan.linkedActionIds});
      await tx.carePlan.update({where:{id},data:{locationId:data.locationId,clientId:data.clientId!,status:"AWAITING_APPROVAL",overallRisk:data.overallRisk as never,nextReviewDate:date(data.nextReviewDate),careCoordinatorId:data.careCoordinatorId,registeredManagerId:data.registeredManagerId,serviceType:data.serviceType,fundingType:data.fundingType,localAuthorityCode:data.localAuthorityCode,localAuthorityName:data.localAuthorityName,commissioner:data.commissioner,linkedActionIds,assignments:{deleteMany:{},create:staffIds.map((staffMemberId)=>({staffMemberId}))}}});
      await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId:data.locationId,userId:context.user.id,action:"UPDATE",recordType:"CarePlan",recordId:id,summary:`Prepared care plan ${plan.reference} version ${versionNumber} for approval`,beforeValue:{version:live?.versionNumber,status:plan.status},afterValue:{version:versionNumber,changedSections:materialSectionLabels(changes),status:"AWAITING_APPROVAL"}}});
    });
    return NextResponse.json({ok:true});
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not update the care plan."},{status:400});} finally{await db.$disconnect();}
}

function fields(form:FormData){return{clientId:nullable(form,"clientId"),locationId:nullable(form,"locationId"),careCoordinatorId:nullable(form,"careCoordinatorId"),registeredManagerId:nullable(form,"registeredManagerId"),nextReviewDate:text(form,"nextReviewDate"),serviceType:text(form,"serviceType")||null,fundingType:text(form,"fundingType")||null,localAuthorityCode:text(form,"localAuthorityCode")||null,localAuthorityName:text(form,"localAuthorityName")||null,commissioner:text(form,"commissioner")||null,overallRisk:text(form,"overallRisk")||"LOW",reason:text(form,"reason")||"Care plan update"};}
function parseSnapshot(form:FormData){try{return{...parseCarePlanSnapshot(JSON.parse(text(form,"snapshot"))),schemaVersion:CARE_PLAN_SCHEMA_VERSION};}catch{throw new Error("The structured care-plan data could not be read.");}}
function unique(form:FormData,key:string){return[...new Set(form.getAll(key).map(String).filter(Boolean))];}
async function validateLinks(db:ReturnType<typeof createDb>,context:Awaited<ReturnType<typeof requirePermission>>,input:ReturnType<typeof fields>&{evidenceIds:string[];staffIds:string[]}){if(input.locationId&&!context.locations.some((x)=>x.id===input.locationId))throw new Error("Choose an authorised service location.");if(input.clientId&&!(await db.client.findFirst({where:{id:input.clientId,...clientScopeWhere(context)},select:{id:true}})))throw new Error("Choose an authorised person record.");const users=[input.careCoordinatorId,input.registeredManagerId].filter(Boolean)as string[];if(users.length&&await db.organisationMembership.count({where:{organisationId:context.organisation.id,userId:{in:users},status:"ACTIVE"}})!==new Set(users).size)throw new Error("Choose active accountable users.");if(input.evidenceIds.length&&await db.evidence.count({where:{id:{in:input.evidenceIds},...evidenceScopeWhere(context)}})!==input.evidenceIds.length)throw new Error("An evidence link is not authorised.");if(input.staffIds.length&&await db.staffMember.count({where:{id:{in:input.staffIds},organisationId:context.organisation.id,archivedAt:null}})!==input.staffIds.length)throw new Error("A staff assignment is not authorised.");}
function text(form:FormData,key:string){return String(form.get(key)??"").trim();}function nullable(form:FormData,key:string){return text(form,key)||null;}function date(value:string){const d=new Date(`${value}T12:00:00.000Z`);return Number.isNaN(d.getTime())?null:d;}function section(snapshot:Record<string,unknown>,key:string){const value=snapshot[key];return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
