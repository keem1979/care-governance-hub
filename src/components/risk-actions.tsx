"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RiskArchiveAction({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function act() { if (!confirm(`${archived ? "Restore" : "Archive"} this risk?`)) return; setBusy(true); const response = await fetch(`/api/risks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: archived ? "restore" : "archive" }) }); setBusy(false); if (response.ok) router.refresh(); }
  return <button type="button" disabled={busy} onClick={act} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? "Working…" : archived ? "Restore" : "Archive"}</button>;
}

export function RiskReviewForm({ id, defaults }: { id: string; defaults: { likelihood: number; impact: number; nextReviewDate: string } }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const response = await fetch(`/api/risks/${id}/reviews`, { method: "POST", body: new FormData(event.currentTarget) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setError(result.error ?? "Could not record review."); setBusy(false); return; } (event.currentTarget as HTMLFormElement).reset(); setBusy(false); router.refresh(); }
  const cls = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2";
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">{error && <p role="alert" className="md:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label className="text-sm font-medium">Review date<input name="reviewDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className={cls}/></label><label className="text-sm font-medium">Next review date<input name="nextReviewDate" type="date" required defaultValue={defaults.nextReviewDate} className={cls}/></label><label className="text-sm font-medium">Likelihood<select name="likelihood" defaultValue={defaults.likelihood} className={cls}>{[1,2,3,4,5].map((item)=><option key={item}>{item}</option>)}</select></label><label className="text-sm font-medium">Impact<select name="impact" defaultValue={defaults.impact} className={cls}>{[1,2,3,4,5].map((item)=><option key={item}>{item}</option>)}</select></label><label className="text-sm font-medium">Controls effective?<select name="controlsEffective" className={cls}><option value="true">Yes</option><option value="false">No</option></select></label><label className="md:col-span-2 text-sm font-medium">Review notes<textarea name="notes" required minLength={3} className={`${cls} min-h-24`}/></label><button disabled={busy} className="w-fit rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy?"Saving…":"Record review"}</button></form>;
}
