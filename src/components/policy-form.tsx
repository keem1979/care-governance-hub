"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { POLICY_CATEGORIES, POLICY_STATUSES } from "@/lib/policies";

type Owner = { id: string; name: string };
type Initial = {
  id: string; title: string; category: string; ownerId: string; status: string;
  effectiveDate: string; nextReviewDate: string; tags: string; complianceAreas: string; notes: string;
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900";

export function PolicyForm({ owners, initial }: { owners: Owner[]; initial?: Initial }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const response = await fetch(initial ? `/api/policies/${initial.id}` : "/api/policies", {
      method: initial ? "PATCH" : "POST", body: new FormData(event.currentTarget),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "We couldn’t save this policy. Please check the details and try again."); setBusy(false); return; }
    router.push(`/policies/${initial?.id ?? result.id}`); router.refresh();
  }
  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2 text-sm font-medium">Policy title
          <input className={`${inputClass} mt-1`} name="title" defaultValue={initial?.title} required minLength={3} maxLength={180} />
        </label>
        <label className="text-sm font-medium">Category
          <select className={`${inputClass} mt-1`} name="category" defaultValue={initial?.category ?? ""} required>
            <option value="">Select a category</option>
            {POLICY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Owner
          <select className={`${inputClass} mt-1`} name="ownerId" defaultValue={initial?.ownerId ?? owners[0]?.id} required>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
        {initial ? (
          <label className="text-sm font-medium">Workflow status
            <select className={`${inputClass} mt-1`} name="status" defaultValue={initial.status}>
              {POLICY_STATUSES.map((status) => <option key={status} value={status}>{status.replace("_", " ").toLowerCase()}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label className="text-sm font-medium">Version
              <input className={`${inputClass} mt-1`} name="versionNumber" defaultValue="1.0" required />
            </label>
            <label className="text-sm font-medium">Policy document (PDF, DOC or DOCX; max 10 MB)
              <input className={`${inputClass} mt-1`} name="document" type="file" accept=".pdf,.doc,.docx" required />
            </label>
          </>
        )}
        <label className="text-sm font-medium">Effective date
          <input className={`${inputClass} mt-1`} name="effectiveDate" type="date" defaultValue={initial?.effectiveDate} />
        </label>
        <label className="text-sm font-medium">Next review date
          <input className={`${inputClass} mt-1`} name="nextReviewDate" type="date" defaultValue={initial?.nextReviewDate} />
        </label>
        <label className="text-sm font-medium">Tags <span className="font-normal text-slate-500">(comma-separated)</span>
          <input className={`${inputClass} mt-1`} name="tags" defaultValue={initial?.tags} />
        </label>
        <label className="text-sm font-medium">Compliance areas <span className="font-normal text-slate-500">(comma-separated)</span>
          <input className={`${inputClass} mt-1`} name="complianceAreas" defaultValue={initial?.complianceAreas} />
        </label>
        <label className="md:col-span-2 text-sm font-medium">Notes
          <textarea className={`${inputClass} mt-1 min-h-28`} name="notes" defaultValue={initial?.notes} />
        </label>
      </div>
      <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? "Saving…" : initial ? "Save policy" : "Create policy"}
      </button>
    </form>
  );
}
