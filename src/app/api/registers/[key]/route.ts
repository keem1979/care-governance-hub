import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { assessmentPrerequisites, assessmentType } from "@/lib/assessments";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { clientScopeWhere } from "@/lib/clients";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { syncRegisterEvidence } from "@/lib/register-evidence";
import { collectRegisterData, makeRegisterReference, parseRegisterFields, REGISTER_RISK_LEVELS, REGISTER_STATUSES } from "@/lib/registers";
import { workforceScopeWhere } from "@/lib/workforce";

export async function POST(request:Request,{params}:{params:Promise<{key:string}>}){
  const context=await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);const{key}=await params;const form=await request.formData();const db=createDb();
  try{
    const definition=await db.registerDefinition.findFirst({where:{key,isPublished:true,OR:[{organisationId:null},{organisationId:context.organisation.id}]}});
    if(!definition)return NextResponse.json({error:"Register not found."},{status:404});
    const assured=["incidents","complaints","safeguarding"].includes(key);
    const title=String(form.get("title")??"").trim(),summary=String(form.get("summary")??"").trim(),submittedLocationId=String(form.get("locationId")??"")||null,ownerId=String(form.get("ownerId")??"")||null,clientId=String(form.get("clientId")??"")||null,staffMemberId=String(form.get("staffMemberId")??"")||null,riskLevel=String(form.get("riskLevel")??"UNASSESSED"),status=String(form.get("status")??"OPEN");
    const locationId=!context.allLocations&&context.locations.length===1&&!submittedLocationId?context.locations[0].id:submittedLocationId;
    if(title.length<3||summary.length<3)throw new Error("Enter a title and summary.");
    if(form.has("organisationId")&&String(form.get("organisationId"))!==context.organisation.id)throw new Error("Organisation scope is not authorised.");
    if(assured&&status!=="OPEN")throw new Error("New governed records must start open; closure and archival require their governed workflows.");
    if(assured&&String(form.get("closureDate")??"").trim())throw new Error("A new governed record cannot have a closure date.");
    if(!context.allLocations&&!locationId)throw new Error("Choose an authorised location.");
    if(locationId&&!context.locations.some((item)=>item.id===locationId))throw new Error("Choose an authorised location.");
    if(!REGISTER_RISK_LEVELS.includes(riskLevel as never)||!REGISTER_STATUSES.includes(status as never))throw new Error("Choose valid status and risk values.");
    if(riskLevel==="UNASSESSED"&&status==="CLOSED")throw new Error("Assess the risk before closing this record.");
    if(ownerId&&!(await db.organisationMembership.findFirst({where:{organisationId:context.organisation.id,userId:ownerId,status:"ACTIVE"}})))throw new Error("Choose an active owner.");
    if(clientId&&!(await db.client.findFirst({where:{id:clientId,...clientScopeWhere(context)}})))throw new Error("Choose an authorised client record.");
    if(staffMemberId&&!(await db.staffMember.findFirst({where:{id:staffMemberId,...workforceScopeWhere(context)}})))throw new Error("Choose an authorised staff record.");
    if(assessmentType(key)?.stage!=="SERVICE"&&key.startsWith("assessment-")&&!clientId)throw new Error("Choose the client this assessment relates to.");
    if(key==="safeguarding"&&!clientId)throw new Error("Choose the client this safeguarding concern relates to.");
    const evidenceIds=form.getAll("evidenceIds").map(String).filter(Boolean);
    for(const evidenceId of evidenceIds)if(!(await db.evidence.findFirst({where:{id:evidenceId,...evidenceScopeWhere(context)}})))throw new Error("Linked evidence could not be found.");
    const reference=String(form.get("reference")??"").trim()||makeRegisterReference(key);
    const data:Record<string,unknown>=collectRegisterData(form,parseRegisterFields(definition.fieldSchema));
    const prerequisiteReferences:Record<string,string>={};
    for(const prerequisite of assessmentPrerequisites(key)){
      const exists=clientId&&await db.registerEntry.findFirst({where:{organisationId:context.organisation.id,clientId,status:{not:"ARCHIVED"},definition:{key:prerequisite.key}},select:{reference:true},orderBy:{eventDate:"desc"}});
      if(!exists)throw new Error(`${prerequisite.label} must be completed for this client first.`);
      prerequisiteReferences[prerequisite.key]=exists.reference;
    }
    if(Object.keys(prerequisiteReferences).length)data.prerequisiteReferences=prerequisiteReferences;
    const eventDate=parseOptionalDate(form.get("eventDate"))??new Date();
    const entry=await db.$transaction(async(tx)=>{
      const created=await tx.registerEntry.create({data:{organisationId:context.organisation.id,definitionId:definition.id,locationId,clientId,staffMemberId,reference,eventDate,title,summary,riskLevel:riskLevel as never,status:status as never,ownerId,data:data as Prisma.InputJsonValue,closureDate:assured?null:parseOptionalDate(form.get("closureDate")),createdById:context.user.id,evidenceLinks:{create:evidenceIds.map((evidenceId)=>({evidenceId}))},...(key==="complaints"?{complaintInvestigation:{create:{organisationId:context.organisation.id,locationId,investigatorId:ownerId??context.user.id,complainantName:text(data.complainantName)||null,complainantRelationship:text(data.complainantRelationship)||null,contactPreference:text(data.contactPreference)||null,accessibilityNeeds:text(data.accessibilityNeeds)||null,category:text(data.category)||null,immediateSafetyConcern:text(data.immediateSafetyConcern)||null,immediateSafetyResponse:text(data.immediateSafetyResponse)||null}}}:{})}});
      if(key==="safeguarding"){
        const safetyPosition=safeguardingSafety(text(data.safetyPosition));
        await tx.safeguardingCase.create({data:{organisationId:context.organisation.id,locationId,safeguardingId:created.id,investigatorId:ownerId??context.user.id,safetyPosition,immediateControl:text(data.immediateResponse)||null}});
        await tx.safeguardingEvent.create({data:{organisationId:context.organisation.id,locationId,safeguardingId:created.id,type:"CONCERN_RAISED",occurredAt:eventDate,summary,participants:text(data.raisedBy)||null,authorId:context.user.id,evidenceId:evidenceIds[0]??null}});
      }
      await syncRegisterEvidence(tx,{entryId:created.id,organisationId:context.organisation.id,locationId,definitionKey:key,definitionName:definition.name,reference,title,summary,eventDate,ownerId,actorId:context.user.id,archived:status==="ARCHIVED"});
      const snapshot={reference,title,summary,riskLevel,status,data};
      await tx.registerEntryHistory.create({data:{entryId:created.id,userId:context.user.id,action:"CREATED",snapshot:snapshot as Prisma.InputJsonValue}});
      await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId,userId:context.user.id,action:"CREATE",recordType:"RegisterEntry",recordId:created.id,summary:`Added ${definition.name} entry: ${reference}`,afterValue:snapshot as Prisma.InputJsonValue}});
      return created;
    });
    return NextResponse.json({id:entry.id},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not add entry."},{status:400});}
  finally{await db.$disconnect();}
}

function text(value:unknown){return typeof value==="string"?value.trim():"";}
function safeguardingSafety(value:string){if(value==="Safe now")return "SAFE_NOW" as const;if(value==="Immediate risk controlled")return "CONTROLLED_IMMEDIATE_RISK" as const;if(value==="Immediate risk unresolved")return "UNRESOLVED_IMMEDIATE_RISK" as const;return "UNKNOWN_EVIDENCE_REQUIRED" as const;}
