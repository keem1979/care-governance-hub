import Link from "next/link";
import { ControlledMappingForm, EvidenceMappingReviewForm, EvidenceVerificationForm, FrameworkChangeForm, FrameworkReviewUpdateForm, MockInspectionForm } from "@/components/evidence-assurance-controls";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceAssuranceLabel, evidenceAssuranceState, mappingSupportsClaim } from "@/lib/evidence-assurance";
import { evidenceScopeWhere } from "@/lib/evidence";
import { inspectionScopeWhere } from "@/lib/inspection";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const VIEWS = [["evidence","Evidence validity"],["claims","Claim traceability"],["controlled","Policies & templates"],["framework","Framework changes"],["mock","Mock inspections"]] as const;

export default async function EvidenceAssurancePage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW); const query = await searchParams; const view = VIEWS.some(([key])=>key===query.view) ? String(query.view) : "evidence"; const canManage = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT); const db = createDb();
  try {
    const [evidence, requirements, policies, templates, members, frameworkReviews, mockInspections] = await Promise.all([
      db.evidence.findMany({ where: evidenceScopeWhere(context), include: { owner: { select: { name: true } }, location: { select: { name: true } }, currentVersion: { select: { id: true, checksum: true } }, verifications: { include: { verifiedBy: { select: { name: true } } }, orderBy: { verifiedAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" }, take: 1000 }),
      db.complianceRequirement.findMany({
        where: inspectionScopeWhere(context),
        include: {
          location: { select: { name: true } },
          evidenceLinks: {
            include: {
              evidence: {
                include: {
                  verifications: { orderBy: { verifiedAt: "desc" }, take: 1 },
                },
              },
            },
          },
          policyMappings: {
            include: {
              policy: {
                select: { title: true, status: true, approvalStatus: true, nextReviewDate: true },
              },
            },
          },
          templateMappings: {
            include: {
              template: {
                select: { title: true, status: true, reviewDate: true, version: true },
              },
            },
          },
        },
        orderBy: [{ keyQuestion: "asc" }, { title: "asc" }],
      }),
      db.policy.findMany({ where: { organisationId: context.organisation.id, archivedAt: null }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
      db.template.findMany({ where: { status: { not: "ARCHIVED" }, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE", user: { isActive: true } }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.frameworkChangeReview.findMany({ where: { organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item)=>item.id) } }] }) }, include: { frameworkVersion: true, owner: { select: { name: true } }, location: { select: { name: true } } }, orderBy: [{ reviewDueAt: "asc" }, { createdAt: "desc" }] }),
      db.mockInspection.findMany({ where: { organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item)=>item.id) } }] }) }, include: { lead: { select: { name: true } }, location: { select: { name: true } }, samples: { select: { outcome: true } } }, orderBy: [{ plannedAt: "desc" }] }),
    ]);
    const now = new Date();
    const evidenceRows = evidence.map((item) => ({ item, state: evidenceAssuranceState({ status: item.status, reviewExpiryDate: item.reviewExpiryDate, updatedAt: item.updatedAt, currentVersionId: item.currentVersionId, verification: item.verifications[0] }) }));
    const claimRows = requirements.map((requirement) => {
      const mappings = requirement.evidenceLinks.map((mapping) => { const state = evidenceAssuranceState({ status: mapping.evidence.status, reviewExpiryDate: mapping.evidence.reviewExpiryDate, updatedAt: mapping.evidence.updatedAt, currentVersionId: mapping.evidence.currentVersionId, verification: mapping.evidence.verifications[0] }); return { mapping, state, support: mappingSupportsClaim(mapping.decision, state) }; });
      const full = mappings.filter((item)=>item.support==="FULL").length, partial = mappings.filter((item)=>item.support==="PARTIAL").length;
      return { requirement, mappings, full, partial, claimState: full ? "TRACEABLE" : partial ? "PARTIAL" : "UNSUBSTANTIATED" };
    });
    const unverified = evidenceRows.filter((row)=>!["CURRENT_VERIFIED","VERIFIED_WITH_LIMITATIONS","EXPIRING_SOON"].includes(row.state)).length;
    const expiring = evidenceRows.filter((row)=>["EXPIRING_SOON","EXPIRED"].includes(row.state)).length;
    const unsubstantiated = claimRows.filter((row)=>row.claimState==="UNSUBSTANTIATED").length;
    const overdueFramework = frameworkReviews.filter((item)=>!["IMPLEMENTED","NO_ACTION_REQUIRED"].includes(item.status)&&item.reviewDueAt<now).length;
    const requirementOptions = requirements.map((item)=>({id:item.id,name:`${evidenceAssuranceLabel(item.keyQuestion)} · ${item.title}`}));
    const memberOptions = members.map(({user})=>user), policyOptions=policies.map((item)=>({id:item.id,name:item.title})), templateOptions=templates.map((item)=>({id:item.id,name:item.title}));
    return <main className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Phase 6 · evidence and regulatory assurance</p><h1 className="mt-1 text-3xl font-bold">Evidence Assurance</h1><p className="mt-2 max-w-4xl text-slate-600">Trace each internal assurance claim to its source, current version, suitability decision and named verification. This workspace supports management judgement; it does not predict or certify a regulator’s decision.</p></header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Evidence needing verification" value={unverified} danger={Boolean(unverified)}/><Metric label="Expired or expiring" value={expiring} danger={Boolean(expiring)}/><Metric label="Unsubstantiated claims" value={unsubstantiated} danger={Boolean(unsubstantiated)}/><Metric label="Overdue framework reviews" value={overdueFramework} danger={Boolean(overdueFramework)}/></section>
      <nav className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3" aria-label="Evidence assurance views">{VIEWS.map(([key,label])=><Link key={key} href={`/evidence-assurance?view=${key}`} className={`rounded-xl px-3 py-2 text-sm font-bold ${view===key?"bg-emerald-800 text-white":"border text-slate-700"}`}>{label}</Link>)}</nav>
      {view==="evidence" ? <section className="grid gap-4 xl:grid-cols-2">{evidenceRows.map(({item,state})=><article key={item.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-emerald-700">{evidenceAssuranceLabel(item.sourceType)} · {item.category}</p><Link href={`/evidence/${item.id}`} className="mt-1 block text-lg font-bold text-emerald-900">{item.title}</Link><p className="mt-1 text-xs text-slate-500">{item.sourceName??"Source not recorded"} · {item.location?.name??"Organisation-wide"}</p></div><Badge value={state}/></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><Small label="Current version" value={item.currentVersion?.id?"Checksum recorded":"Live source"}/><Small label="Expiry" value={date(item.reviewExpiryDate)}/><Small label="Owner" value={item.owner.name}/></div>{item.verifications[0]?<p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Latest decision by <strong>{item.verifications[0].verifiedBy.name}</strong> on {date(item.verifications[0].verifiedAt)} · {evidenceAssuranceLabel(item.verifications[0].outcome)}</p>:<p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900">No named verification has been recorded.</p>}{canManage?<details className="mt-4"><summary className="cursor-pointer text-sm font-bold text-blue-900">Record new verification</summary><div className="mt-3"><EvidenceVerificationForm evidenceId={item.id}/></div></details>:null}</article>)}</section> : null}
      {view==="claims" ? <section className="grid gap-4 xl:grid-cols-2">{claimRows.map(({requirement,mappings,full,partial,claimState})=><article key={requirement.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-emerald-700">{evidenceAssuranceLabel(requirement.keyQuestion)}</p><Link href={`/inspection/${requirement.id}`} className="mt-1 block text-lg font-bold text-emerald-900">{requirement.title}</Link></div><Badge value={claimState}/></div><p className="mt-3 text-sm text-slate-600">{full} fully supporting · {partial} partially supporting · {mappings.length} explicitly mapped</p>{mappings.length?<div className="mt-4 space-y-3">{mappings.map(({mapping,state,support})=><div key={mapping.evidenceId} className="rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/evidence/${mapping.evidenceId}`} className="font-bold text-emerald-800">{mapping.evidence.title}</Link><span className="text-xs font-bold">{evidenceAssuranceLabel(mapping.decision)} · {evidenceAssuranceLabel(state)} · {support.toLowerCase()} support</span></div>{canManage?<EvidenceMappingReviewForm requirementId={requirement.id} evidenceId={mapping.evidenceId} initialDecision={mapping.decision} initialRationale={mapping.rationale??""} initialCategories={mapping.evidenceCategories}/>:null}</div>)}</div>:<p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-900">No explicit evidence mapping. Tagged or nearby records do not substantiate this claim.</p>}</article>)}</section> : null}
      {view==="controlled" ? <section className="space-y-5"><article className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Map controlled policies and templates</h2><p className="mt-1 mb-4 text-sm text-slate-600">Record why current controlled content addresses a requirement. A mapping does not prove implementation in practice.</p>{canManage?<ControlledMappingForm policies={policyOptions} templates={templateOptions} requirements={requirementOptions}/>:null}</article><div className="grid gap-4 xl:grid-cols-2">{requirements.filter((item)=>item.policyMappings.length||item.templateMappings.length).map((item)=><article key={item.id} className="rounded-2xl border bg-white p-5"><Link href={`/inspection/${item.id}`} className="font-bold text-emerald-900">{item.title}</Link><div className="mt-3 space-y-2">{item.policyMappings.map((mapping)=><MappingLine key={mapping.id} kind="Policy" label={mapping.policy.title} decision={mapping.decision} rationale={mapping.rationale}/>) }{item.templateMappings.map((mapping)=><MappingLine key={mapping.id} kind="Template" label={`${mapping.template.title} v${mapping.template.version}`} decision={mapping.decision} rationale={mapping.rationale}/>)}</div></article>)}</div></section> : null}
      {view==="framework" ? <section className="space-y-5">{canManage?<article className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Record an official framework change</h2><p className="mt-1 mb-4 text-sm text-slate-600">Use the regulator’s official source. The system creates impact-review work; it never silently changes policies, templates or assurance requirements.</p><FrameworkChangeForm members={memberOptions} locations={context.locations.map(({id,name})=>({id,name}))} requirements={requirementOptions} policies={policyOptions} templates={templateOptions}/></article>:null}<div className="grid gap-4 xl:grid-cols-2">{frameworkReviews.map((item)=><article key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-blue-700">{item.frameworkVersion.jurisdiction} · {item.frameworkVersion.regulator}</p><h2 className="mt-1 font-bold">{item.frameworkVersion.name} · {item.frameworkVersion.versionLabel}</h2></div><Badge value={item.status}/></div><p className="mt-3 text-sm">{item.changeSummary}</p><p className="mt-3 text-xs text-slate-500">Owner {item.owner.name} · {item.location?.name??"Organisation-wide"} · due {date(item.reviewDueAt)} · {item.affectedRequirementIds.length} requirements · {item.affectedPolicyIds.length} policies · {item.affectedTemplateIds.length} templates</p><a href={item.frameworkVersion.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-blue-800 underline">Open recorded official source</a>{canManage?<FrameworkReviewUpdateForm id={item.id} initialStatus={item.status} initialImpact={item.impactAssessment??""} initialActions={item.actionSummary??""}/>:null}</article>)}</div></section> : null}
      {view==="mock" ? <section className="space-y-5">{canManage?<article className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Plan a mock inspection sample</h2><p className="mt-1 mb-4 text-sm text-slate-600">Choose a proportionate sample. Review documentary evidence alongside people’s experience, staff feedback and observed practice.</p><MockInspectionForm members={memberOptions} locations={context.locations.map(({id,name})=>({id,name}))} requirements={requirementOptions}/></article>:null}<div className="grid gap-4 xl:grid-cols-2">{mockInspections.map((item)=><Link key={item.id} href={`/evidence-assurance/mock-inspections/${item.id}`} className="rounded-2xl border bg-white p-5 shadow-sm hover:border-emerald-400"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-emerald-700">{item.frameworkLabel}</p><h2 className="mt-1 text-lg font-bold">{item.title}</h2></div><Badge value={item.status}/></div><p className="mt-3 text-sm text-slate-600">{item.scope}</p><p className="mt-3 text-xs text-slate-500">Lead {item.lead.name} · {item.location?.name??"Organisation-wide"} · {date(item.plannedAt)} · {item.samples.filter((sample)=>sample.outcome!=="NOT_TESTED").length}/{item.samples.length} sampled</p></Link>)}</div></section> : null}
    </main>;
  } finally { await db.$disconnect(); }
}

function Metric({label,value,danger}:{label:string;value:number;danger:boolean}){return <article className={`rounded-2xl border p-5 ${danger?"border-red-200 bg-red-50 text-red-950":"border-emerald-200 bg-emerald-50 text-emerald-950"}`}><p className="text-xs font-bold uppercase tracking-wide">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>}
function Badge({value}:{value:string}){const danger=["UNVERIFIED","EXPIRED","REJECTED","STALE_VERIFICATION","UNSUBSTANTIATED","ACTIONS_REQUIRED","GAP"].includes(value), good=["CURRENT_VERIFIED","TRACEABLE","IMPLEMENTED","NO_ACTION_REQUIRED","COMPLETED","ASSURED"].includes(value);return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${danger?"bg-red-100 text-red-800":good?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800"}`}>{evidenceAssuranceLabel(value)}</span>}
function Small({label,value}:{label:string;value:string}){return <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>}
function MappingLine({kind,label,decision,rationale}:{kind:string;label:string;decision:string;rationale:string}){return <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><strong>{kind}: {label}</strong><Badge value={decision}/></div><p className="mt-1 text-xs text-slate-600">{rationale}</p></div>}
function date(value:Date|null){return value?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeZone:"Europe/London"}).format(value):"Not set"}
