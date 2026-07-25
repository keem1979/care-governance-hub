"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CQC_KEY_QUESTIONS, INSPECTION_EVIDENCE_STATUSES, inspectionLabel } from "@/lib/inspection";

type Option = { id: string; name: string };
type Initial = { id: string; keyQuestion: string; qualityStatement: string; title: string; explanation: string; evidenceExamples: string[]; locationId: string; ownerId: string; reviewDate: string; evidenceStatus: string; confidenceNote: string; evidenceIds: string[]; auditIds: string[]; registerEntryIds: string[]; actionIds: string[] };

export function InspectionRequirementForm({ members, locations, evidence, audits, registers, actions, initial }: { members: Option[]; locations: Option[]; evidence: Option[]; audits: Option[]; registers: Option[]; actions: Option[]; initial?: Initial }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(initial ? `/api/inspection/${initial.id}` : "/api/inspection", { method: initial ? "PATCH" : "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not save evidence requirement."); setBusy(false); return; }
    router.push(`/inspection/${initial?.id ?? result.id}`); router.refresh();
  }
  return <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium">Key question<select name="keyQuestion" className={field} defaultValue={initial?.keyQuestion ?? "SAFE"}>{CQC_KEY_QUESTIONS.map((item) => <option key={item} value={item}>{inspectionLabel(item)}</option>)}</select></label>
      <label className="text-sm font-medium">Quality statement<input name="qualityStatement" className={field} defaultValue={initial?.qualityStatement} placeholder="Configurable statement" /></label>
      <label className="text-sm font-medium md:col-span-2">Requirement title<input name="title" required minLength={3} className={field} defaultValue={initial?.title} /></label>
      <label className="text-sm font-medium md:col-span-2">Explanation<textarea name="explanation" required minLength={10} className={`${field} min-h-24`} defaultValue={initial?.explanation} /></label>
      <label className="text-sm font-medium md:col-span-2">Evidence examples<p className="text-xs font-normal text-slate-500">One per line or comma-separated.</p><textarea name="evidenceExamples" className={`${field} min-h-24`} defaultValue={initial?.evidenceExamples.join("\n")} /></label>
      <label className="text-sm font-medium">Location<select name="locationId" className={field} defaultValue={initial?.locationId ?? ""}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Owner<select name="ownerId" className={field} defaultValue={initial?.ownerId ?? ""}><option value="">Unassigned</option>{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Review date<input name="reviewDate" type="date" className={field} defaultValue={initial?.reviewDate} /></label>
      <label className="text-sm font-medium">Evidence status<select name="evidenceStatus" className={field} defaultValue={initial?.evidenceStatus ?? "NO_EVIDENCE"}>{INSPECTION_EVIDENCE_STATUSES.map((item) => <option key={item} value={item}>{inspectionLabel(item)}</option>)}</select></label>
      <label className="text-sm font-medium md:col-span-2">Confidence note<textarea name="confidenceNote" className={`${field} min-h-20`} defaultValue={initial?.confidenceNote} placeholder="Internal assurance note and any uncertainty" /></label>
      <Multi label="Documents from Evidence Library" name="evidenceIds" options={evidence} defaults={initial?.evidenceIds ?? []} />
      <Multi label="Audits" name="auditIds" options={audits} defaults={initial?.auditIds ?? []} />
      <Multi label="Register entries" name="registerEntryIds" options={registers} defaults={initial?.registerEntryIds ?? []} />
      <Multi label="Actions" name="actionIds" options={actions} defaults={initial?.actionIds ?? []} />
    </div>
    <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : initial ? "Save requirement" : "Create requirement"}</button>
  </form>;
}
function Multi({ label, name, options, defaults }: { label: string; name: string; options: Option[]; defaults: string[] }) { return <label className="text-sm font-medium">{label}<p className="text-xs font-normal text-slate-500">Use Ctrl or Command for multiple.</p><select multiple name={name} defaultValue={defaults} className="mt-1 min-h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>; }
