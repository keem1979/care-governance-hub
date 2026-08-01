import Link from "next/link";
import { notFound } from "next/navigation";
import { RegisterEntryForm } from "@/components/register-entry-form";
import { assessmentType } from "@/lib/assessments";
import { requirePermission } from "@/lib/auth/dal";
import { clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseRegisterFields, registerFormExperience, registerGuidance, registerScopeWhere } from "@/lib/registers";
import { workforceScopeWhere } from "@/lib/workforce";
const dateInput=(value:Date|null)=>value?.toISOString().slice(0,10)??"";

export default async function EditRegisterEntryPage({params}:{params:Promise<{key:string;id:string}>}){const context=await requirePermission(PERMISSIONS.GOVERNANCE_EDIT),{key,id}=await params,db=createDb();try{const[entry,memberships,evidence,clients,staff]=await Promise.all([
db.registerEntry.findFirst({where:{id,...registerScopeWhere(context),definition:{key}},include:{definition:true,evidenceLinks:{where:{evidence:{NOT:{relatedModule:"RegisterEntry"}}}}}}),
db.organisationMembership.findMany({where:{organisationId:context.organisation.id,status:"ACTIVE"},select:{user:{select:{id:true,name:true}}},orderBy:{user:{name:"asc"}}}),
db.evidence.findMany({where:{...evidenceScopeWhere(context),status:"ACTIVE",NOT:{relatedModule:"RegisterEntry"}},select:{id:true,title:true},orderBy:{title:"asc"}}),
db.client.findMany({where:{...clientScopeWhere(context),status:{not:"ARCHIVED"}},select:{id:true,clientReference:true,firstName:true,lastName:true,preferredName:true},orderBy:[{lastName:"asc"},{firstName:"asc"}]}),
db.staffMember.findMany({where:workforceScopeWhere(context),select:{id:true,employeeReference:true,firstName:true,lastName:true,preferredName:true},orderBy:[{lastName:"asc"},{firstName:"asc"}]})]);
if(!entry)notFound();const experience=registerFormExperience(key,entry.definition.name),guidance=registerGuidance(key);return <main className="mx-auto max-w-4xl space-y-5"><div><Link href={`/registers/${key}/${id}`} className="text-sm font-semibold text-emerald-700">← Back to record</Link><h1 className="mt-2 text-3xl font-bold">Edit: {entry.title}</h1><p className="mt-1 text-slate-600">Update the {experience.titleLabel.toLowerCase()} and record what has changed.</p></div><aside className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><p><strong>When to use this register:</strong> {guidance.when}</p><p className="mt-1">Changes update the linked Evidence Library record automatically.</p></aside><RegisterEntryForm registerKey={key} registerName={entry.definition.name} fields={parseRegisterFields(entry.definition.fieldSchema)} locations={context.locations.map(({id,name})=>({id,name}))} owners={memberships.map(({user})=>user)} clients={clients.map(person=>({id:person.id,name:`${clientName(person)} · ${person.clientReference}`}))} staff={staff.map(person=>({id:person.id,name:`${person.preferredName||person.firstName} ${person.lastName} · ${person.employeeReference}`}))} clientRequired={Boolean(assessmentType(key)&&assessmentType(key)?.stage!=="SERVICE")} evidence={evidence} initial={{id:entry.id,reference:entry.reference,eventDate:dateInput(entry.eventDate),title:entry.title,summary:entry.summary,riskLevel:entry.riskLevel,status:entry.status,locationId:entry.locationId??"",ownerId:entry.ownerId??"",clientId:entry.clientId??"",staffMemberId:entry.staffMemberId??"",closureDate:dateInput(entry.closureDate),data:entry.data as Record<string,unknown>,evidenceIds:entry.evidenceLinks.map(x=>x.evidenceId)}}/></main>}finally{await db.$disconnect()}}
