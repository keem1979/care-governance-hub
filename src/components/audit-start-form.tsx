"use client";

import { ChevronDown, Clock3, FileCheck2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { auditQuickStartSample } from "@/lib/audits";

type Template = { id: string; key: string; name: string; version: string; description: string | null; questionCount: number; category: string; standardRefs: string[]; frequency: string | null; serviceSpecific: boolean };

export function AuditStartForm({ templates, locations, selectedTemplate }: { templates: Template[]; locations: { id: string; name: string }[]; selectedTemplate?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState(selectedTemplate && templates.some((item) => item.id === selectedTemplate) ? selectedTemplate : templates[0]?.id ?? "");
  const selected = useMemo(() => templates.find((item) => item.id === templateId), [templateId, templates]);
  const quickStart = auditQuickStartSample(selected?.key ?? "");
  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/audits", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not start audit."); setBusy(false); return; }
    router.push(`/audits/${result.id}#audit-form`);
    router.refresh();
  }

  if (!templates.length) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-bold">No audit forms are available</h2><p className="mt-1 text-sm">An administrator needs to publish an audit template before an audit can be started.</p></section>;

  return <form onSubmit={submit} className="space-y-5">
    <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-6 py-6 text-white sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Registered Manager quick start</p><h2 className="mt-2 text-2xl font-black">Open the audit in under a minute</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">Choose the form, service and date. QCGMS creates the title, purpose, standards and sensible sampling defaults for you.</p></div><div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-emerald-50"><Clock3 size={16}/> Three essential choices</div></div>
      </div>

      <div className="p-5 sm:p-7">
        {error ? <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
          <label className="text-sm font-bold text-slate-800"><span className="mb-1 flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-emerald-100 text-xs text-emerald-800">1</span>Audit form</span><select className={field} name="templateId" value={templateId} onChange={(event) => setTemplateId(event.target.value)} required>{templates.map((item) => <option key={item.id} value={item.id}>{item.category} · {item.name}</option>)}</select></label>
          <label className="text-sm font-bold text-slate-800"><span className="mb-1 flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-emerald-100 text-xs text-emerald-800">2</span>Service / location</span><select className={field} name="locationId" required>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-bold text-slate-800"><span className="mb-1 flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-emerald-100 text-xs text-emerald-800">3</span>Audit date</span><input className={field} name="auditDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-800 text-white"><FileCheck2 size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-emerald-950">{selected?.name}</h3><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800">{selected?.questionCount ?? 0} checks</span><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800">v{selected?.version}</span></div><p className="mt-1 text-sm leading-6 text-emerald-950">{selected?.description}</p><p className="mt-2 text-xs text-emerald-800"><strong>QCGMS will prepare:</strong> document title, audit objective, standards, {quickStart.method === "FULL_POPULATION" ? "whole-plan review" : `risk-based sample of ${quickStart.size}`} and the full question set.</p></div></div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={busy || !selected?.questionCount} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-6 py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"><Sparkles size={17}/>{busy ? "Opening audit…" : "Start audit now"}</button><p className="text-xs text-slate-500">You can save the audit at any point and return later.</p></div>
      </div>
    </section>

    <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-slate-800"><span><span className="block">Optional setup</span><span className="mt-0.5 block text-xs font-normal text-slate-500">Only open this if you need to change QCGMS defaults.</span></span><ChevronDown size={18} className="transition group-open:rotate-180"/></summary>
      <div className="grid gap-4 border-t border-slate-200 p-5 md:grid-cols-2">
        <label className="text-sm font-medium md:col-span-2">Custom audit title<input className={field} name="title" minLength={3} maxLength={180} placeholder={`Leave blank to use: ${new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date())} ${selected?.name ?? "audit"}`} /></label>
        <label className="text-sm font-medium">Period reviewed from<input className={field} name="periodStart" type="date" /></label>
        <label className="text-sm font-medium">Period reviewed to<input className={field} name="periodEnd" type="date" /></label>
        <label className="text-sm font-medium md:col-span-2">Audit objective<textarea key={`objective-${selected?.id}`} className={`${field} min-h-20`} name="objective" defaultValue={selected?.description ?? ""} /></label>
        <label className="text-sm font-medium md:col-span-2">Scope<textarea className={`${field} min-h-20`} name="scope" placeholder="Optional: note anything included or excluded from this review." /></label>
        <label className="text-sm font-medium">Sampling method<select key={`method-${selected?.id}`} className={field} name="sampleMethod" defaultValue={quickStart.method}><option value="RISK_AND_RANDOM">Risk-based plus random sample</option><option value="RANDOM">Random sample</option><option value="TARGETED">Targeted sample</option><option value="FULL_POPULATION">Full population / whole plan</option><option value="OBSERVATION">Direct observation</option><option value="RECONCILIATION">System reconciliation</option></select></label>
        <label className="text-sm font-medium">Sample size<input key={`size-${selected?.id}`} className={field} name="sampleSize" type="number" min={1} step={1} defaultValue={quickStart.size} /></label>
        <label className="text-sm font-medium md:col-span-2">Sample details<textarea className={`${field} min-h-20`} name="sampleDetails" placeholder="Optional: record identifiers, selection dates or exclusions. Avoid names." /></label>
        <label className="text-sm font-medium md:col-span-2">Standard or procedure tested<textarea key={`standard-${selected?.id}`} className={`${field} min-h-20`} name="standardApplied" defaultValue={selected?.standardRefs.join("; ") ?? ""} /></label>
        <label className="text-sm font-medium md:col-span-2">Known limitations<textarea className={`${field} min-h-20`} name="limitations" placeholder="Optional: note unavailable records or limits on assurance." /></label>
      </div>
    </details>
  </form>;
}
