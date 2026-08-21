import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceFamily, evidenceType } from "@/lib/evidence-taxonomy";
import { PERMISSIONS } from "@/lib/permissions";
import { controlReference, PROVIDER_CONTROL_FAMILIES, providerControlScopeAllowed } from "@/lib/provider-controls";

const schema=z.object({title:z.string().trim().min(3).max(180),description:z.string().trim().min(10).max(3000),family:z.enum(PROVIDER_CONTROL_FAMILIES),applicableRiskCategoryKeys:z.array(z.string()).default([]),scopeType:z.enum(["ORGANISATION","SELECTED_LOCATIONS"]),locationIds:z.array(z.string().uuid()).default([]),accountableOwnerId:z.string().uuid().nullable().optional(),expectedEvidenceFamilyKeys:z.array(z.string()).default([]),expectedEvidenceTypeKeys:z.array(z.string()).default([]),expectedEffectivenessMethod:z.string().trim().max(2000).nullable().optional(),effectiveFrom:z.string().date().nullable().optional(),reviewDueAt:z.string().date().nullable().optional(),changeRationale:z.string().trim().min(8).max(2000)});

export async function POST(request:Request){
  const context=await requirePermission(PERMISSIONS.CONTROLS_MANAGE),db=createDb();
  try{
    const input=schema.parse(await request.json());
    if(!providerControlScopeAllowed(context,input.scopeType,input.locationIds))throw new Error("The selected Provider Control scope is outside your authorised locations.");
    for(const key of input.expectedEvidenceFamilyKeys)if(!evidenceFamily(key))throw new Error("Choose a recognised core Evidence family.");
    for(const compound of input.expectedEvidenceTypeKeys){const[familyKey,typeKey]=compound.split(":");if(!evidenceType(familyKey,typeKey))throw new Error("Choose a recognised contextual Evidence type.");}
    if(input.accountableOwnerId&&!(await db.organisationMembership.findFirst({where:{organisationId:context.organisation.id,userId:input.accountableOwnerId,status:"ACTIVE"}})))throw new Error("Choose an active Control owner.");
    const base=controlReference(input.title);let stableKey=base,suffix=1;while(await db.providerControl.findUnique({where:{organisationId_stableKey:{organisationId:context.organisation.id,stableKey}}}))stableKey=`${base}-${++suffix}`;
    const created=await db.$transaction(async tx=>{const control=await tx.providerControl.create({data:{organisationId:context.organisation.id,stableKey,createdById:context.user.id}});const version=await tx.providerControlVersion.create({data:{organisationId:context.organisation.id,controlId:control.id,versionNumber:1,status:"DRAFT",title:input.title,description:input.description,family:input.family,applicableRiskCategoryKeys:input.applicableRiskCategoryKeys,scopeType:input.scopeType,accountableOwnerId:input.accountableOwnerId||null,expectedEvidenceFamilyKeys:input.expectedEvidenceFamilyKeys,expectedEvidenceTypeKeys:input.expectedEvidenceTypeKeys,expectedEffectivenessMethod:input.expectedEffectivenessMethod||null,effectiveFrom:input.effectiveFrom?new Date(`${input.effectiveFrom}T00:00:00.000Z`):null,reviewDueAt:input.reviewDueAt?new Date(`${input.reviewDueAt}T00:00:00.000Z`):null,changeRationale:input.changeRationale,createdById:context.user.id,locations:{create:input.scopeType==="SELECTED_LOCATIONS"?input.locationIds.map(locationId=>({locationId})):[]}}});await tx.activityLog.create({data:{organisationId:context.organisation.id,userId:context.user.id,action:"CREATE",recordType:"ProviderControlVersion",recordId:version.id,summary:`Created Provider Control draft ${stableKey} v1`,afterValue:{title:input.title,scopeType:input.scopeType,locationIds:input.locationIds}}});return control});
    return NextResponse.json({id:created.id},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not create Provider Control."},{status:400})}finally{await db.$disconnect()}
}
