import type { Prisma } from "@/generated/prisma/client";

export async function syncRiskEvidence(tx:Prisma.TransactionClient,input:{riskId:string;organisationId:string;locationId:string|null;reference:string;title:string;description:string;category:string;ownerId:string|null;createdById:string;actorId:string;identifiedDate:Date|null;nextReviewDate:Date;residualScore:number;residualLevel:string;status:string;existingControls:string;controlEffectiveness:string|null}){
  const existing=await tx.evidence.findFirst({where:{organisationId:input.organisationId,relatedModule:"Risk",relatedRecordId:input.riskId},select:{id:true}});
  const archived=input.status==="ARCHIVED";
  const data={organisationId:input.organisationId,locationId:input.locationId,title:`Live risk: ${input.reference} — ${input.title}`.slice(0,180),description:`${input.description} Current residual risk: ${input.residualScore} (${input.residualLevel}). Controls: ${input.existingControls}`.slice(0,2000),category:"Health and safety",evidenceType:"Risk assurance record",sourceType:"INTERNAL_RECORD" as const,sourceName:"Risk Register",sourceReference:input.reference,ownerId:input.ownerId??input.createdById,evidenceDate:input.identifiedDate,reviewExpiryDate:input.nextReviewDate,tags:["system-generated","risk",`risk-category:${input.category.toLowerCase().replaceAll(" ","-")}`,`risk-level:${input.residualLevel.toLowerCase()}`,"requirement:well-risk-register"],relatedModule:"Risk",relatedRecordId:input.riskId,confidentiality:"CONFIDENTIAL" as const,status:archived?"ARCHIVED" as const:"ACTIVE" as const,archivedAt:archived?new Date():null,notes:`Generated from the Risk Register and kept in sync automatically. Control effectiveness: ${input.controlEffectiveness?.replaceAll("_"," ").toLowerCase()??"not tested"}. Open the source risk for controls, actions and review history.`};
  const evidence=existing?await tx.evidence.update({where:{id:existing.id},data}):await tx.evidence.create({data:{...data,uploadedById:input.actorId}});
  await tx.riskEvidence.upsert({where:{riskId_evidenceId_role:{riskId:input.riskId,evidenceId:evidence.id,role:"SUPPORTING"}},create:{riskId:input.riskId,evidenceId:evidence.id,role:"SUPPORTING"},update:{}});
  return evidence;
}

export function isRiskEvidence(tags:readonly string[]){return tags.includes("risk")&&tags.includes("system-generated")}
