import Link from "next/link";
import { notFound } from "next/navigation";
import { CarePlanReviewForm } from "@/components/care-plan-review-form";
import { requirePermission } from "@/lib/auth/dal";
import { carePlanScopeWhere, parseCarePlanSnapshot } from "@/lib/care-plans";
import { clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewCarePlanReviewPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), query = await searchParams, db = createDb();
  try {
    const carePlanId=String(query.carePlanId??"");
    const [definition,memberships,evidence,clients,carePlan]=await Promise.all([
      db.registerDefinition.findFirst({where:{key:"care-plan-reviews",isPublished:true,OR:[{organisationId:context.organisation.id},{organisationId:null}]}}),
      db.organisationMembership.findMany({where:{organisationId:context.organisation.id,status:"ACTIVE"},select:{user:{select:{id:true,name:true}}},orderBy:{user:{name:"asc"}}}),
      db.evidence.findMany({where:{...evidenceScopeWhere(context),status:"ACTIVE",NOT:{relatedModule:"RegisterEntry"}},select:{id:true,title:true},orderBy:{title:"asc"},take:1000}),
      db.client.findMany({where:{...clientScopeWhere(context),status:{in:["PROSPECT","ACTIVE","PAUSED"]}},select:{id:true,clientNumber:true,clientReference:true,firstName:true,lastName:true,preferredName:true},orderBy:[{lastName:"asc"},{firstName:"asc"}],take:1000}),
      carePlanId?db.carePlan.findFirst({where:{id:carePlanId,...carePlanScopeWhere(context)}}):null,
    ]);
    if(!definition)notFound();
    const sourceCarePlan=carePlan?.currentVersionId?await sourcePlan(db,carePlan):undefined;
    return <main className="space-y-5"><header><Link href="/registers/care-plan-reviews" className="text-sm font-semibold text-emerald-700">← Care Plan Reviews</Link><p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Registered Manager assurance workflow</p><h1 className="mt-1 text-3xl font-bold">New care-plan review</h1><p className="mt-1 max-w-4xl text-slate-600">Review changing needs, outcomes, risks and care arrangements with accountable follow-up and management assurance.</p></header><CarePlanReviewForm organisationName={context.organisation.name} locations={context.locations.map(({id,name})=>({id,name}))} owners={memberships.map(({user})=>user)} clients={clients.map((person)=>({id:person.id,name:`${clientName(person)} · Client ${person.clientNumber} · ${person.clientReference}`}))} evidence={evidence} defaultClientId={carePlan?.clientId??String(query.clientId??"")} sourceCarePlan={sourceCarePlan}/></main>;
  } finally { await db.$disconnect(); }
}

async function sourcePlan(db:ReturnType<typeof createDb>,plan:{id:string;currentVersionId:string|null;reference:string;currentVersionNumber:number;nextReviewDate:Date|null;overallRisk:string}) {
  const version=plan.currentVersionId?await db.carePlanVersion.findUnique({where:{id:plan.currentVersionId}}):null;if(!version)return undefined;
  const snapshot=parseCarePlanSnapshot(version.snapshot),about=obj(snapshot.aboutMe),deterioration=obj(snapshot.deterioration),medication=obj(snapshot.medication),safeguarding=obj(snapshot.safeguarding),carePackage=obj(snapshot.carePackage);
  return{id:plan.id,versionId:version.id,reference:plan.reference,versionNumber:version.versionNumber,snapshot,reviewDefaults:{carePlanReference:plan.reference,carePlanVersion:String(version.versionNumber),reviewDueDate:plan.nextReviewDate?.toISOString().slice(0,10)??"",currentRisk:plan.overallRisk,importantNow:String(about.importantToMe??""),whatIWantStaffToKnow:String(about.ownWords??""),baselinePresentation:String(deterioration.baseline??""),warningSigns:String(deterioration.warningSigns??""),redFlags:String(deterioration.redFlags??""),medicationApplies:medication.responsibility?"Yes":"No",packageOverall:String(carePackage.sufficiency??""),safeguardingConcern:safeguarding.vulnerabilities?"Yes":"No",domains:Array.isArray(snapshot.domains)?snapshot.domains.map((x)=>String(obj(x).name??"")).filter(Boolean):[]}};
}
function obj(value:unknown){return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
