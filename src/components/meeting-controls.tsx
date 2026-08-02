"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACTION_PRIORITIES } from "@/lib/actions";

export function MeetingArchive({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter(), [busy, setBusy] = useState(false);
  async function act() { if (!confirm(`${archived ? "Restore" : "Archive"} this meeting?`)) return; setBusy(true); const response = await fetch(`/api/meetings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: archived ? "restore" : "archive" }) }); setBusy(false); if (response.ok) router.refresh(); }
  return <button onClick={act} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">{busy ? "Working…" : archived ? "Restore" : "Archive"}</button>;
}

export function ExtractActionForm({ meetingId, agendaId, title, owners }: { meetingId: string; agendaId: string; title: string; owners: { id: string; name: string }[] }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const response = await fetch(`/api/meetings/${meetingId}/actions`, { method: "POST", body: new FormData(event.currentTarget) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setError(result.error ?? "The action could not be created."); setBusy(false); return; } router.refresh(); }
  const cls = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  return <details className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><summary className="cursor-pointer text-sm font-bold text-emerald-900">Create an accountable action from this decision</summary><form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-2"><input type="hidden" name="agendaId" value={agendaId} /><label className="text-xs font-bold">What needs to be done?<input name="title" defaultValue={title} required className={`mt-1 w-full ${cls}`} /></label><label className="text-xs font-bold">Accountable owner<select name="ownerId" required className={`mt-1 w-full ${cls}`}><option value="">Choose owner</option>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-bold">Expected outcome<input name="expectedOutcome" required placeholder="What will be different?" className={`mt-1 w-full ${cls}`} /></label><label className="text-xs font-bold">How success will be checked<input name="successMeasure" required placeholder="Evidence or measure" className={`mt-1 w-full ${cls}`} /></label><label className="text-xs font-bold">Priority<select name="priority" className={`mt-1 w-full ${cls}`}>{ACTION_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-bold">Due date<input name="dueDate" type="date" required className={`mt-1 w-full ${cls}`} /></label><div className="md:col-span-2"><button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">{busy ? "Creating action…" : "Create and link action"}</button></div>{error && <p role="alert" className="text-sm text-red-700 md:col-span-2">{error}</p>}</form></details>;
}
