import Link from "next/link";
import { CheckCircle2, Mic, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { ASSESSMENT_KEYS, ASSESSMENT_TYPES } from "@/lib/assessments";
import { registerScopeWhere } from "@/lib/registers";

const stages=[
  {key:"START",title:"Start here",description:"Confirm needs, suitability, decision-specific consent and lawful authority before specialist assessment."},
  {key:"PERSON",title:"Person-centred assessments",description:"Choose only assessments relevant to the person’s needs, choices and planned support."},
  {key:"SERVICE",title:"Service, workplace and impact assessments",description:"Assess organisational change, premises, workers, information and continuity risks."},
] as const;

export default async function AssessmentsPage(){
  const context=await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);const db=createDb();
  const [definitions,counts]=await Promise.all([
    db.registerDefinition.findMany({where:{key:{in:ASSESSMENT_KEYS},isPublished:true,OR:[{organisationId:null},{organisationId:context.organisation.id}]},select:{id:true,key:true}}),
    db.registerEntry.groupBy({by:["definitionId"],where:registerScopeWhere(context),_count:{_all:true}}),
  ]).finally(()=>db.$disconnect());
  const idByKey=new Map(definitions.map((item)=>[item.key,item.id]));const countById=new Map(counts.map((item)=>[item.definitionId,item._count._all]));
  return <main className="space-y-7">
    <header><h1 className="text-3xl font-bold">Assessment Centre</h1><p className="mt-1 max-w-3xl text-slate-600">Start an initial assessment, record consent, assess individual risks or consider the effect of a service change.</p></header>
    <section className="grid gap-4 md:grid-cols-3"><Step number="1" title="Initial assessment" text="Understand needs, preferences, outcomes and whether the service can safely help."/><Step number="2" title="Consent and authority" text="Record each decision separately and use capacity or best-interest processes when required."/><Step number="3" title="Relevant assessments" text="Complete only those indicated by need or risk, then review after change or at the planned date."/></section>
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950"><div className="flex gap-3"><Mic className="mt-0.5 shrink-0"/><div><h2 className="font-bold">Speak instead of typing</h2><p className="mt-1 text-sm leading-6">Click any narrative box and choose <strong>Voice type</strong>. Speech is handled by the browser and is not stored as an audio recording. Always read the text back before saving.</p></div></div></section>
    {stages.map((stage)=><section key={stage.key} className="space-y-4"><div><h2 className="text-xl font-bold">{stage.title}</h2><p className="mt-1 text-sm text-slate-600">{stage.description}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ASSESSMENT_TYPES.filter((item)=>item.stage===stage.key).map((item)=>{const id=idByKey.get(item.key);return <article key={item.key} className={`rounded-2xl border bg-white p-5 shadow-sm ${stage.key==="START"?"border-emerald-300":"border-slate-200"}`}><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={20}/></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{id?countById.get(id)??0:0} records</span></div><h3 className="mt-4 font-bold">{item.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p><div className="mt-4 flex flex-wrap gap-3"><Link href={`/registers/${item.key}`} className="text-sm font-bold text-emerald-800">Open records →</Link><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-600">Guidance ↗</a></div></article>})}</div></section>)}
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-amber-800"/><div><h2 className="font-bold text-amber-950">Professional judgement remains essential</h2><p className="mt-1 text-sm leading-6 text-amber-950">These records support governance; they do not diagnose, replace validated clinical tools, or remove the need for a competent assessor. Use recognised tools where appropriate and attach the completed source document as evidence.</p></div></div></section>
  </main>
}
function Step({number,title,text}:{number:string,title:string,text:string}){return <div className="rounded-2xl border border-emerald-200 bg-emerald-950 p-5 text-white"><span className="grid size-8 place-items-center rounded-full bg-white text-sm font-bold text-emerald-950">{number}</span><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-emerald-100">{text}</p></div>}
