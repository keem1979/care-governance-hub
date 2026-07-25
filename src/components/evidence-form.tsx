"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EVIDENCE_CATEGORIES, EVIDENCE_CONFIDENTIALITY, EVIDENCE_STATUSES, EVIDENCE_TYPES } from "@/lib/evidence";

type Option = { id: string; name: string };
type PolicyOption = { id: string; title: string };
type Initial = { id: string; title: string; description: string; category: string; evidenceType: string; ownerId: string; locationId: string; evidenceDate: string; reviewExpiryDate: string; tags: string; relatedModule: string; relatedRecordId: string; confidentiality: string; status: string; notes: string };
const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900";

export function EvidenceForm({ owners, locations, policies, initial }: { owners: Option[]; locations: Option[]; policies: PolicyOption[]; initial?: Initial }) {
  const router = useRouter();
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(initial ? `/api/evidence/${initial.id}` : "/api/evidence", { method: initial ? "PATCH" : "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Something went wrong."); setBusy(false); return; }
    router.push(`/evidence/${initial?.id ?? result.id}`); router.refresh();
  }
  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="md:col-span-2 text-sm font-medium">Title {initial ? null : <span className="font-normal text-slate-500">(optional for a single file; filenames are used for multiple files)</span>}<input className={field} name="title" defaultValue={initial?.title} required={Boolean(initial)} maxLength={180} /></label>
      <label className="md:col-span-2 text-sm font-medium">Description<textarea className={`${field} min-h-20`} name="description" defaultValue={initial?.description} /></label>
      <label className="text-sm font-medium">Category<select className={field} name="category" defaultValue={initial?.category ?? ""} required><option value="">Choose category</option>{EVIDENCE_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-medium">Evidence type<select className={field} name="evidenceType" defaultValue={initial?.evidenceType ?? ""} required><option value="">Choose type</option>{EVIDENCE_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-medium">Record owner<select className={field} name="ownerId" defaultValue={initial?.ownerId ?? owners[0]?.id} required>{owners.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
      <label className="text-sm font-medium">Service location<select className={field} name="locationId" defaultValue={initial?.locationId ?? ""}><option value="">Organisation-wide</option>{locations.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
      {!initial && <label className="md:col-span-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5 text-sm font-medium">Evidence files <span className="font-normal text-slate-600">(up to 10; PDF, Office, CSV, JPG or PNG; 10 MB each)</span><input className={`${field} border-0`} name="documents" type="file" multiple required accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" /></label>}
      <label className="text-sm font-medium">Evidence date<input className={field} name="evidenceDate" type="date" defaultValue={initial?.evidenceDate} /></label>
      <label className="text-sm font-medium">Review or expiry date<input className={field} name="reviewExpiryDate" type="date" defaultValue={initial?.reviewExpiryDate} /></label>
      <label className="text-sm font-medium">Confidentiality<select className={field} name="confidentiality" defaultValue={initial?.confidentiality ?? "INTERNAL"}>{EVIDENCE_CONFIDENTIALITY.map((value) => <option key={value}>{value.toLowerCase()}</option>)}</select></label>
      {initial && <label className="text-sm font-medium">Record status<select className={field} name="status" defaultValue={initial.status}>{EVIDENCE_STATUSES.map((value) => <option key={value}>{value.toLowerCase()}</option>)}</select></label>}
      <label className="text-sm font-medium">Tags <span className="font-normal text-slate-500">(comma-separated)</span><input className={field} name="tags" defaultValue={initial?.tags} /></label>
      <label className="text-sm font-medium">Related module<select className={field} name="relatedModule" defaultValue={initial?.relatedModule ?? ""}><option value="">No link</option><option>Policy</option><option disabled>Audit (coming later)</option><option disabled>Action (coming later)</option></select></label>
      <label className="md:col-span-2 text-sm font-medium">Related policy<select className={field} name="relatedRecordId" defaultValue={initial?.relatedRecordId ?? ""}><option value="">None</option>{policies.map((value) => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
      <label className="md:col-span-2 text-sm font-medium">Notes<textarea className={`${field} min-h-24`} name="notes" defaultValue={initial?.notes} /></label>
    </div>
    <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : initial ? "Save evidence" : "Upload evidence"}</button>
  </form>;
}
