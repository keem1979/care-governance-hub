"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { kpiLabel } from "@/lib/kpis";

type Definition = { id: string; name: string; unit: string; direction: string; targetValue: number; greenThreshold: number; amberThreshold: number };
type Option = { id: string; name: string };

export function KpiEntryForm({ definitions, locations, evidence, defaultMonth }: { definitions: Definition[]; locations: Option[]; evidence: Option[]; defaultMonth: string }) {
  const router = useRouter();
  const [kpiId, setKpiId] = useState(definitions[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => definitions.find((item) => item.id === kpiId) ?? definitions[0], [definitions, kpiId]);
  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const response = await fetch("/api/kpis", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not save KPI entry."); setBusy(false); return; }
    router.push(`/kpis?month=${result.month}&kpi=${kpiId}`);
    router.refresh();
  }
  if (!selected) return <p>No KPI definitions are available.</p>;
  return <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium md:col-span-2">KPI<select name="kpiId" value={kpiId} onChange={(event) => setKpiId(event.target.value)} className={field}>{definitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Reporting month<input name="reportingMonth" type="month" required defaultValue={defaultMonth} className={field} /></label>
      <label className="text-sm font-medium">Location<select name="locationId" defaultValue="" className={field}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Actual ({selected.unit})<input name="actualValue" type="number" step="any" required className={field} /></label>
      <label className="text-sm font-medium">Target ({selected.unit})<input key={`${kpiId}-target`} name="targetValue" type="number" step="any" required defaultValue={selected.targetValue} className={field} /></label>
      <label className="text-sm font-medium">Green threshold<input key={`${kpiId}-green`} name="greenThreshold" type="number" step="any" required defaultValue={selected.greenThreshold} className={field} /></label>
      <label className="text-sm font-medium">Amber threshold<input key={`${kpiId}-amber`} name="amberThreshold" type="number" step="any" required defaultValue={selected.amberThreshold} className={field} /></label>
      <div className="rounded-xl bg-slate-50 p-4 text-sm md:col-span-2"><strong>RAG direction:</strong> {kpiLabel(selected.direction)}. Values outside the amber threshold are red.</div>
      <label className="text-sm font-medium md:col-span-2">Notes<textarea name="notes" className={`${field} min-h-24`} placeholder="Context, explanation and planned response" /></label>
      <label className="text-sm font-medium md:col-span-2">Evidence attachments<p className="text-xs font-normal text-slate-500">Use Ctrl or Command to select several records.</p><select name="evidenceIds" multiple className={`${field} min-h-32`}>{evidence.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save monthly KPI"}</button>
  </form>;
}

export function KpiCsvImport() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/kpis/import", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `${result.imported} KPI rows imported.` : result.error ?? "Could not import CSV.");
    if (response.ok) router.refresh();
    setBusy(false);
  }
  return <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-bold">CSV import</h2>
    <p className="text-sm text-slate-600">Columns: kpi, month, location, actual, target, green_threshold, amber_threshold, notes.</p>
    <input name="file" type="file" accept=".csv,text/csv" required className="block w-full rounded-lg border border-slate-300 p-2 text-sm" />
    <button disabled={busy} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{busy ? "Importing..." : "Import CSV"}</button>
    {message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}
  </form>;
}
