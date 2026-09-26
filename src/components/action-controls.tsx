"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACTION_STATUSES, actionLabel } from "@/lib/actions";

export function ActionArchive({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter(), [busy, setBusy] = useState(false);
  async function act() {
    if (!confirm(`${archived ? "Restore" : "Archive"} this action?`)) return;
    setBusy(true);
    const response = await fetch(`/api/actions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: archived ? "restore" : "archive" }) });
    setBusy(false);
    if (response.ok) router.refresh();
  }
  return <button onClick={act} disabled={busy} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60">{busy ? "Working…" : archived ? "Restore" : "Archive"}</button>;
}

export function ActionUpdateForm({ id, status, progress }: { id: string; status: string; progress: number }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setError("");
    const response = await fetch(`/api/actions/${id}/updates`, { method: "POST", body: new FormData(form) }), result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not add update."); setBusy(false); return; }
    form.reset(); setBusy(false); router.refresh();
  }
  const cls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
    <input type="hidden" name="intent" value="progress" />
    {error && <p role="alert" className="md:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <label className="text-sm font-semibold md:col-span-2">What changed since the last update?<textarea name="note" required minLength={3} className={`${cls} min-h-24`} placeholder="Record the work completed, check made or response received." /></label>
    <label className="text-sm font-semibold">Delivery progress<input name="progressPercent" type="number" min="0" max="99" defaultValue={Math.min(progress, 99)} className={cls} /><span className="mt-1 block text-xs font-normal text-slate-500">Submit completed work separately when it is ready for verification.</span></label>
    <details className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-bold">Scheduling, next step or blocker</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">Current delivery status<select name="status" defaultValue={["OPEN", "OVERDUE"].includes(status) ? "IN_PROGRESS" : status} className={cls}>{ACTION_STATUSES.filter((value) => !["OVERDUE", "ARCHIVED", "CANCELLED", "COMPLETED"].includes(value)).map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}</select></label><label className="text-sm font-semibold">Next step<input name="nextStep" className={cls} placeholder="What happens next?" /></label><label className="text-sm font-semibold md:col-span-2">Blocker or delay<textarea name="blocker" className={`${cls} min-h-20`} placeholder="Required when status is Blocked" /></label></div></details>
    <div className="md:col-span-2 flex justify-end"><button disabled={busy} className="min-h-11 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving update…" : "Save progress update"}</button></div>
  </form>;
}

export function ActionCompletionForm({ id, evidence, linkedCompletion }: { id: string; evidence: { id: string; name: string }[]; linkedCompletion: { id: string; name: string }[] }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const response = await fetch(`/api/actions/${id}/updates`, { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not submit completion."); setBusy(false); return; }
    setBusy(false); router.refresh();
  }
  const cls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
  return <form onSubmit={submit} className="grid gap-4">
    <input type="hidden" name="intent" value="complete" />
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
    <label className="text-sm font-semibold">What did you do?<textarea name="note" required minLength={3} rows={3} className={cls} placeholder="Describe the work completed." /></label>
    {linkedCompletion.length ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">Already linked as completion Evidence: <strong>{linkedCompletion.map(item => item.name).join(", ")}</strong></p> : null}
    <label className="text-sm font-semibold">Evidence supporting completion
      <select name="evidenceId" required={!linkedCompletion.length} defaultValue="" className={cls}><option value="" disabled={!linkedCompletion.length}>{linkedCompletion.length ? "Use already linked Completion Evidence" : "Choose existing Evidence"}</option>{evidence.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <span className="mt-1 block text-xs font-normal text-slate-500">{linkedCompletion.length ? "You can submit with the linked Evidence above or choose another record." : "Choose an existing authorised Evidence record. If you need to upload a new file, ask a manager with Evidence access."}</span>
    </label>
    <button disabled={busy} className="min-h-11 justify-self-start rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Submitting…" : "Submit for verification"}</button>
    <p className="text-xs text-slate-600">A manager still needs to verify the work. This does not close the Action.</p>
  </form>;
}
