"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Template = { id: string; name: string; version: string; description: string | null; questionCount: number };

export function AuditStartForm({ templates, locations, selectedTemplate }: { templates: Template[]; locations: { id: string; name: string }[]; selectedTemplate?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState(selectedTemplate && templates.some((item) => item.id === selectedTemplate) ? selectedTemplate : templates[0]?.id ?? "");
  const selected = useMemo(() => templates.find((item) => item.id === templateId), [templateId, templates]);
  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/audits", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not start audit.");
      setBusy(false);
      return;
    }
    router.push(`/audits/${result.id}#audit-form`);
    router.refresh();
  }

  if (!templates.length) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-bold">No audit forms are available</h2><p className="mt-1 text-sm">An administrator needs to publish an audit template before an audit can be started.</p></section>;

  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    {error ? <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Selected audit form</p><h2 className="mt-1 text-lg font-bold">{selected?.name}</h2><p className="mt-1 text-sm text-slate-600">{selected?.description}</p><p className="mt-2 text-sm font-semibold text-emerald-900">{selected?.questionCount ?? 0} questions · version {selected?.version}</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium">Audit form<select className={field} name="templateId" value={templateId} onChange={(event) => setTemplateId(event.target.value)} required>{templates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.questionCount} questions</option>)}</select></label>
      <label className="text-sm font-medium">Location<select className={field} name="locationId" required>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium md:col-span-2">Audit title<input className={field} name="title" required minLength={3} placeholder={`For example, ${new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date())} ${selected?.name.toLowerCase() ?? "audit"}`} /></label>
      <label className="text-sm font-medium">Audit date<input className={field} name="auditDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
      <div />
      <label className="text-sm font-medium">Period reviewed from<input className={field} name="periodStart" type="date" /></label>
      <label className="text-sm font-medium">Period reviewed to<input className={field} name="periodEnd" type="date" /></label>
      <label className="text-sm font-medium md:col-span-2">Scope and sample<textarea className={`${field} min-h-24`} name="scope" placeholder="Describe the service, staff or records being reviewed and the planned sample size." /></label>
    </div>
    <button disabled={busy || !selected?.questionCount} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Creating audit…" : "Create audit and open form"}</button>
    {!selected?.questionCount ? <p className="text-sm text-amber-700">This template has no questions and cannot be used yet.</p> : null}
  </form>;
}
