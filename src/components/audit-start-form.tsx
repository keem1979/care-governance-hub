"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuditStartForm({templates,locations,selectedTemplate}:{templates:{id:string;name:string;version:string}[];locations:{id:string;name:string}[];selectedTemplate?:string}) {
  const router=useRouter(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const response=await fetch("/api/audits",{method:"POST",body:new FormData(event.currentTarget)});const result=await response.json().catch(()=>({}));if(!response.ok){setError(result.error??"Could not start audit.");setBusy(false);return;}router.push(`/audits/${result.id}`);router.refresh();}
  const field="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{error&&<div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="grid gap-4 md:grid-cols-2">
    <label className="text-sm font-medium">Template<select className={field} name="templateId" defaultValue={selectedTemplate??""} required><option value="">Choose template</option>{templates.map((item)=><option key={item.id} value={item.id}>{item.name} · v{item.version}</option>)}</select></label>
    <label className="text-sm font-medium">Location<select className={field} name="locationId" required>{locations.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="md:col-span-2 text-sm font-medium">Audit title<input className={field} name="title" required minLength={3} placeholder="e.g. July medicines audit" /></label>
    <label className="text-sm font-medium">Audit date<input className={field} name="auditDate" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /></label>
    <div />
    <label className="text-sm font-medium">Period reviewed from<input className={field} name="periodStart" type="date" /></label>
    <label className="text-sm font-medium">Period reviewed to<input className={field} name="periodEnd" type="date" /></label>
    <label className="md:col-span-2 text-sm font-medium">Scope<textarea className={`${field} min-h-24`} name="scope" placeholder="What records, teams or time period will this audit cover?" /></label>
  </div><button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy?"Starting…":"Start audit"}</button></form>;
}
