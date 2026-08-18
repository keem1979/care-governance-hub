import "server-only";
import type { AuthorisedContext } from "@/lib/auth/dal";
import { carePlanScopeWhere } from "@/lib/care-plans";
import { clientName } from "@/lib/clients";
import type { createDb } from "@/lib/db";

export async function loadCarePlan(db:ReturnType<typeof createDb>,context:AuthorisedContext,id:string){
  const plan=await db.carePlan.findFirst({where:{id,...carePlanScopeWhere(context)},include:{versions:{include:{changes:{orderBy:{createdAt:"asc"}},evidenceLinks:true},orderBy:{versionNumber:"desc"}},assignments:true,acknowledgements:true}});if(!plan)return null;
  const pointed=plan.currentVersionId?plan.versions.find((v)=>v.id===plan.currentVersionId)??null:null;
  const current=pointed?.status==="PUBLISHED"?pointed:null;
  const proposed=plan.versions.find((v)=>!["PUBLISHED","SUPERSEDED"].includes(v.status))??null;
  const display=proposed??current??plan.versions[0]??null;if(!display)return null;
  const userIds=[plan.careCoordinatorId,plan.registeredManagerId].filter(Boolean)as string[];
  const evidenceIds=[...new Set(display.evidenceLinks.map((x)=>x.evidenceId))],staffIds=plan.assignments.filter((x)=>x.isActive).map((x)=>x.staffMemberId);
  const [client,location,users,evidence,staff,actions,ackUsers]=await Promise.all([
    db.client.findFirst({where:{id:plan.clientId,organisationId:context.organisation.id}}),
    plan.locationId?db.serviceLocation.findFirst({where:{id:plan.locationId,organisationId:context.organisation.id},select:{name:true}}):null,
    userIds.length?db.user.findMany({where:{id:{in:userIds}},select:{id:true,name:true}}):[],
    evidenceIds.length?db.evidence.findMany({where:{id:{in:evidenceIds},organisationId:context.organisation.id},select:{id:true,title:true}}):[],
    staffIds.length?db.staffMember.findMany({where:{id:{in:staffIds},organisationId:context.organisation.id},select:{id:true,firstName:true,lastName:true,preferredName:true}}):[],
    plan.linkedActionIds.length?db.action.findMany({where:{id:{in:plan.linkedActionIds},organisationId:context.organisation.id},select:{id:true,reference:true,title:true,priority:true,status:true}}):[],
    display.id?db.user.findMany({where:{id:{in:plan.acknowledgements.filter((a)=>a.versionId===display.id).map((a)=>a.userId)}},select:{id:true,name:true}}):[],
  ]);
  plan.assignments=plan.assignments.filter((assignment)=>assignment.isActive&&(assignment.versionId===display.id||assignment.versionId===null));
  if(!client)return null;const byUser=new Map(users.map((u)=>[u.id,u.name])),ackByUser=new Map(ackUsers.map((u)=>[u.id,u.name]));
  return{plan,current,proposed,display,person:{name:clientName(client),preferredName:client.preferredName?.trim()||client.firstName,reference:`Client ${client.clientNumber} · ${client.clientReference}`,dateOfBirth:date(client.dateOfBirth),phone:client.phone??"Not recorded",address:[client.addressLine,client.town,client.postcode].filter(Boolean).join(", ")||"Not recorded",communicationSummary:client.communicationSummary??"Not recorded",emergencyContact:client.emergencyContact??client.nextOfKinPhone??"Not recorded",representative:client.nextOfKinName?[client.nextOfKinName,client.nextOfKinRelationship,client.nextOfKinPhone].filter(Boolean).join(" · "):"Not recorded"},location:location?.name??"Organisation-wide",coordinator:plan.careCoordinatorId?byUser.get(plan.careCoordinatorId)??"Not recorded":"Not recorded",manager:plan.registeredManagerId?byUser.get(plan.registeredManagerId)??"Not recorded":"Not recorded",evidence,staff:staff.map((s)=>({id:s.id,name:`${s.preferredName?.trim()||s.firstName} ${s.lastName}`})),actions,acknowledgements:plan.acknowledgements.filter((a)=>a.versionId===display.id).map((a)=>({name:ackByUser.get(a.userId)??"Authorised user",at:a.acknowledgedAt}))};
}
function date(value:Date|null){return value?value.toISOString().slice(0,10):"Not recorded";}
