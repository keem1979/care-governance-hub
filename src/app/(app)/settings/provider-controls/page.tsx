import Link from "next/link";
import { ProviderControlLibrary } from "@/components/provider-control-library";
import { ProviderControlDraftEditor } from "@/components/provider-control-draft-editor";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { CORE_EVIDENCE_FAMILIES } from "@/lib/evidence-taxonomy";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ProviderControlsPage(){
 const context=await requirePermission(PERMISSIONS.CONTROLS_MANAGE),db=createDb();
 try{
  const[controls,extensions,members]=await Promise.all([db.providerControl.findMany({where:{organisationId:context.organisation.id},include:{versions:{include:{locations:{include:{location:{select:{id:true,name:true}}}}},orderBy:{versionNumber:"desc"}}},orderBy:{createdAt:"desc"}}),db.providerEvidenceType.findMany({where:{organisationId:context.organisation.id},orderBy:[{status:"asc"},{label:"asc"}]}),db.organisationMembership.findMany({where:{organisationId:context.organisation.id,status:"ACTIVE"},select:{user:{select:{id:true,name:true}}},orderBy:{user:{name:"asc"}}})]);
  const locations=context.locations.map(item=>({id:item.id,name:item.name})),memberOptions=members.map(item=>({id:item.user.id,name:item.user.name})),serialised=controls.map(control=>({...control,versions:control.versions.map(version=>({...version,effectiveFrom:version.effectiveFrom?.toISOString().slice(0,10)??null,reviewDueAt:version.reviewDueAt?.toISOString().slice(0,10)??null}))}));
  return <main className="space-y-6"><header><Link href="/settings" className="text-sm font-bold text-emerald-700">← Settings</Link><p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-700">Control → Evidence → Effectiveness → Assurance</p><h1 className="text-3xl font-bold">Provider Control Library</h1><p className="mt-2 max-w-4xl text-slate-600">Govern the controls your organisation actually operates and the Evidence normally expected. QCGMS suggestions remain advisory until an authorised manager deliberately confirms a Provider Control on a Risk.</p></header>{serialised.flatMap(control=>control.versions.slice(0,1).filter(version=>version.status==="DRAFT").map(draft=><ProviderControlDraftEditor key={draft.id} controlId={control.id} reference={`${control.stableKey} · v${draft.versionNumber}`} draft={draft} locations={locations} members={memberOptions} families={CORE_EVIDENCE_FAMILIES} canOrganisationWide={context.allLocations}/>))}<ProviderControlLibrary locations={locations} members={memberOptions} families={CORE_EVIDENCE_FAMILIES} controls={serialised} extensions={extensions} canOrganisationWide={context.allLocations}/></main>
 }finally{await db.$disconnect()}
}
