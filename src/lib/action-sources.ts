import"server-only";import type{PrismaClient}from"@/generated/prisma/client";
export type ActionSourceOption={type:string;id:string;label:string};
export async function listActionSources(db:PrismaClient,context:{organisation:{id:string};allLocations:boolean;locations:{id:string}[]}):Promise<ActionSourceOption[]>{
  const location=context.allLocations?{}:{locationId:{in:context.locations.map(({id})=>id)}};
  const[audits,registers,risks,policies]=await Promise.all([
    db.audit.findMany({where:{organisationId:context.organisation.id,...location},select:{id:true,title:true},orderBy:{auditDate:"desc"},take:100}),
    db.registerEntry.findMany({where:{organisationId:context.organisation.id,...(context.allLocations?{}:{OR:[{locationId:null},{locationId:{in:context.locations.map(({id})=>id)}}]}),definition:{key:{in:["complaints","incidents","safeguarding"]}}},select:{id:true,reference:true,title:true,definition:{select:{key:true}}},orderBy:{eventDate:"desc"},take:150}),
    db.risk.findMany({where:{organisationId:context.organisation.id,...(context.allLocations?{}:{OR:[{locationId:null},{locationId:{in:context.locations.map(({id})=>id)}}]})},select:{id:true,reference:true,title:true},orderBy:{updatedAt:"desc"},take:100}),
    db.policy.findMany({where:{organisationId:context.organisation.id,status:{not:"ARCHIVED"}},select:{id:true,title:true},orderBy:{title:"asc"},take:100}),
  ]);
  return[
    ...audits.map((item)=>({type:"AUDIT",id:item.id,label:item.title})),
    ...registers.map((item)=>({type:item.definition.key==="complaints"?"COMPLAINT":item.definition.key==="incidents"?"INCIDENT":"SAFEGUARDING",id:item.id,label:`${item.reference} — ${item.title}`})),
    ...risks.map((item)=>({type:"RISK",id:item.id,label:`${item.reference} — ${item.title}`})),
    ...policies.map((item)=>({type:"POLICY_REVIEW",id:item.id,label:item.title})),
  ];
}
export async function resolveActionSource(db:PrismaClient,organisationId:string,type:string,id:string|null){
  if(type==="MANUAL"){if(id)throw new Error("Manual actions cannot have a source record.");return{reference:null,title:"Manual entry",locationId:null};}
  if(!id)throw new Error("Choose a source record.");
  if(type==="AUDIT"){const item=await db.audit.findFirst({where:{id,organisationId},select:{title:true,locationId:true}});if(item)return{reference:item.title,title:item.title,locationId:item.locationId};}
  if(["COMPLAINT","INCIDENT","SAFEGUARDING"].includes(type)){const key=type==="COMPLAINT"?"complaints":type==="INCIDENT"?"incidents":"safeguarding";const item=await db.registerEntry.findFirst({where:{id,organisationId,definition:{key}},select:{reference:true,title:true,locationId:true}});if(item)return{reference:item.reference,title:item.title,locationId:item.locationId};}
  if(type==="RISK"){const item=await db.risk.findFirst({where:{id,organisationId},select:{reference:true,title:true,locationId:true}});if(item)return{reference:item.reference,title:item.title,locationId:item.locationId};}
  if(type==="POLICY_REVIEW"){const item=await db.policy.findFirst({where:{id,organisationId},select:{title:true}});if(item)return{reference:item.title,title:item.title,locationId:null};}
  if(type==="GOVERNANCE_MEETING")throw new Error("Governance Meeting sources will be available when that module is built.");
  throw new Error("The selected source record is not available in this organisation.");
}
