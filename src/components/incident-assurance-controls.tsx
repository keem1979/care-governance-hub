"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type EvidenceOption = { id: string; title: string; category: string };
type Check = { key: string; label: string; met: boolean; reason: string };
type InvestigationInitial = {
  factualChronology: string;
  informationSources: string;
  personRepresentativeInvolvement: string;
  immediateCauses: string[];
  contributingFactors: string[];
  systemCauses: string[];
  rootCause: string;
  notificationDecisionSummary: string;
  learning: string;
  learningSharedWith: string;
  affectedRecordsReviewed: string;
  outcome: string;
  noFurtherActionRationale: string;
  status: string;
};

export function IncidentInvestigationForm({ id, initial, riskLevel }: { id: string; initial: InvestigationInitial; riskLevel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

  async function save(formElement: HTMLFormElement, intent: "draft" | "complete") {
    setBusy(true); setError("");
    const form = new FormData(formElement);
    form.set("intent", intent);
    const response = await fetch(`/api/registers/incidents/${id}/investigation`, { method: "POST", body: form });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(body.error ?? "Could not save the investigation."); return; }
    router.refresh();
  }

  return <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget, "draft"); }}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-violet-700">Incident investigation</p><h2 className="mt-1 text-xl font-black">Establish facts, causes and learning</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">QCGMS holds the Incident facts. Add only the investigation judgement needed to explain why it happened, what changed and what remains unresolved.</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${initial.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{initial.status === "COMPLETED" ? "COMPLETED" : "DRAFT"}</span></div>
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <Field label="Factual chronology" wide><textarea name="factualChronology" className={`${cls} min-h-28`} defaultValue={initial.factualChronology} placeholder="Set out the verified sequence, including dates, times, decisions and responses." /></Field>
      <Field label="Information sources reviewed" wide><textarea name="informationSources" className={`${cls} min-h-20`} defaultValue={initial.informationSources} placeholder="Records, people, systems, professional information and limitations." /></Field>
      <Field label="Immediate causes"><textarea name="immediateCauses" className={`${cls} min-h-24`} defaultValue={initial.immediateCauses.join("\n")} placeholder="One cause per line" /></Field>
      <Field label="Contributing factors"><textarea name="contributingFactors" className={`${cls} min-h-24`} defaultValue={initial.contributingFactors.join("\n")} placeholder="One factor per line" /></Field>
      <Field label="System causes"><textarea name="systemCauses" className={`${cls} min-h-24`} defaultValue={initial.systemCauses.join("\n")} placeholder="Process, design, resource or oversight factors" /></Field>
      <Field label="Root-cause conclusion" hint={riskLevel === "HIGH" || riskLevel === "CRITICAL" ? "required for this level" : "where proportionate"}><textarea name="rootCause" className={`${cls} min-h-24`} defaultValue={initial.rootCause} /></Field>
      <Field label="Safeguarding, CQC, candour and other notification decisions" wide><textarea name="notificationDecisionSummary" className={`${cls} min-h-24`} defaultValue={initial.notificationDecisionSummary} placeholder="Record each consideration, decision maker, rationale, date and outcome. Do not assume a notification is required solely because an Incident exists." /></Field>
      <Field label="Person / representative involvement" wide><textarea name="personRepresentativeInvolvement" className={`${cls} min-h-20`} defaultValue={initial.personRepresentativeInvolvement} placeholder="How were they involved, supported and informed—or why was involvement not appropriate?" /></Field>
      <Field label="Learning"><textarea name="learning" className={`${cls} min-h-24`} defaultValue={initial.learning} placeholder="What should be retained, changed or tested?" /></Field>
      <Field label="Learning shared and understood"><textarea name="learningSharedWith" className={`${cls} min-h-24`} defaultValue={initial.learningSharedWith} placeholder="Who received the learning, how and what confirms understanding?" /></Field>
      <Field label="Affected governed records reviewed" wide><textarea name="affectedRecordsReviewed" className={`${cls} min-h-20`} defaultValue={initial.affectedRecordsReviewed} placeholder="Care plan, risk assessment, staff competency, policy or other record—and the controlled review outcome." /></Field>
      <Field label="Investigation outcome" wide><textarea name="outcome" className={`${cls} min-h-20`} defaultValue={initial.outcome} placeholder="What is resolved, what remains open and what needs management assurance?" /></Field>
      <Field label="Why no further Action is required" wide hint="complete only when proportionate"><textarea name="noFurtherActionRationale" className={`${cls} min-h-20`} defaultValue={initial.noFurtherActionRationale} placeholder="Leave blank when improvement is being managed through a linked central Action." /></Field>
    </div>
    <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">{busy ? "Saving…" : "Save investigation draft"}</button><button disabled={busy} type="button" onClick={(event) => { const form = event.currentTarget.form; if (form) void save(form, "complete"); }} className="rounded-xl bg-violet-800 px-4 py-2.5 text-sm font-bold text-white">Complete investigation</button></div>
  </form>;
}

export function IncidentAssuranceControls({ id, status, checks, evidence, authority }: { id: string; status: string; checks: Check[]; evidence: EvidenceOption[]; authority: { allowed: boolean; reason: string } }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const visible = useMemo(() => { const q = query.trim().toLowerCase(); return (q ? evidence.filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(q)) : evidence).slice(0, 30); }, [evidence, query]);
  const closed = status === "CLOSED";

  async function decide(decision: "ASSURED_CLOSED" | "NOT_ASSURED" | "REOPENED") {
    setBusy(true); setError("");
    const form = new FormData(); form.set("decision", decision); form.set("rationale", rationale); selected.forEach((id) => form.append("evidenceIds", id));
    const response = await fetch(`/api/registers/incidents/${id}/assurance`, { method: "POST", body: form });
    const body = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setError(body.error ?? "Could not record the assurance decision."); return; }
    setRationale(""); setSelected([]); router.refresh();
  }

  return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
    <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Management Assurance Test</p><h2 className="mt-1 text-xl font-black">{closed ? "Incident is closed by an attributable decision" : checks.every((check) => check.met) ? "Ready for authorised review" : "Outstanding assurance requirements"}</h2>
    <div className="mt-4 grid gap-2 md:grid-cols-2">{checks.map((check) => <div key={check.key} className={`rounded-xl border p-3 text-sm ${check.met ? "border-emerald-200 bg-white" : "border-amber-300 bg-amber-50"}`}><p className="font-bold">{check.met ? "✓" : "!"} {check.label}</p>{!check.met ? <p className="mt-1 text-xs leading-5 text-amber-950">{check.reason}</p> : null}</div>)}</div>
    <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${authority.allowed ? "bg-emerald-100 text-emerald-950" : "bg-amber-100 text-amber-950"}`}>{authority.reason}</p>
    {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
    <label className="mt-4 block text-sm font-bold">Decision rationale<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" placeholder={closed ? "Explain why the Incident must be reopened." : "Explain the evidence considered, current position and management judgement."} /></label>
    {!closed ? <div className="mt-4"><label className="text-sm font-bold">Closure Evidence search<input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" placeholder="Search the governed Evidence Library" /></label><div className="mt-2 grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2">{visible.map((item) => <label key={item.id} className="flex gap-2 rounded-lg border border-slate-100 p-2 text-sm"><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id))} /><span><strong>{item.title}</strong><small className="block text-slate-500">{item.category}</small></span></label>)}{visible.length === 0 ? <p className="text-sm text-slate-500">No matching Evidence.</p> : null}</div></div> : null}
    <div className="mt-5 flex flex-wrap gap-2">{closed ? <button disabled={busy || rationale.trim().length < 12} onClick={() => decide("REOPENED")} className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Reopen Incident</button> : <><button disabled={busy || rationale.trim().length < 12} onClick={() => decide("NOT_ASSURED")} className="rounded-xl border border-amber-500 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 disabled:opacity-50">Record not assured</button><button disabled={busy || !authority.allowed || rationale.trim().length < 12} onClick={() => decide("ASSURED_CLOSED")} className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Authorise Incident closure</button></>}</div>
  </section>;
}

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) { return <label className={`${wide ? "md:col-span-2 " : ""}text-sm font-bold text-slate-800`}>{label}{hint ? <span className="font-normal text-slate-500"> ({hint})</span> : null}{children}</label>; }
