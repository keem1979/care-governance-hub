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

export function ActionUpdateForm({ id, status, progress, evidence }: { id: string; status: string; progress: number; evidence: { id: string; name: string }[] }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setError("");
    const response = await fetch(`/api/actions/${id}/updates`, { method: "POST", body: new FormData(form) }), result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not add update."); setBusy(false); return; }
    form.reset(); setBusy(false); router.refresh();
  }
  const cls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
    {error && <p role="alert" className="md:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <label className="text-sm font-semibold md:col-span-2">What changed since the last update?<textarea name="note" required minLength={3} className={`${cls} min-h-24`} placeholder="Record the work completed, check made or response received." /></label>
    <label className="text-sm font-semibold">Delivery progress<input name="progressPercent" type="number" min="0" max="100" step="5" defaultValue={progress} className={cls} /><span className="mt-1 block text-xs font-normal text-slate-500">100% submits completion for verification; it does not close the Action.</span></label>
    <label className="text-sm font-semibold">Completion Evidence<select name="evidenceId" className={cls}><option value="">No Evidence linked with this update</option>{evidence.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Reuse an existing governed Evidence record where appropriate.</span></label>
    <details className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-bold">Scheduling, next step or blocker</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">Current delivery status<select name="status" defaultValue={["OPEN", "OVERDUE"].includes(status) ? "IN_PROGRESS" : status} className={cls}>{ACTION_STATUSES.filter((value) => !["OVERDUE", "ARCHIVED", "CANCELLED", "COMPLETED"].includes(value)).map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}</select></label><label className="text-sm font-semibold">Next step<input name="nextStep" className={cls} placeholder="What happens next?" /></label><label className="text-sm font-semibold md:col-span-2">Blocker or delay<textarea name="blocker" className={`${cls} min-h-20`} placeholder="Required when status is Blocked" /></label></div></details>
    <div className="md:col-span-2 flex justify-end"><button disabled={busy} className="min-h-11 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving update…" : "Save progress update"}</button></div>
  </form>;
}
