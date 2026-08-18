"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IdentityScanButton() {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; message: string; error: boolean }>({ busy: false, message: "", error: false });
  async function scan() {
    setState({ busy: true, message: "", error: false });
    const response = await fetch("/api/data-quality/scan", { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setState({ busy: false, message: body.error ?? "The scan could not be completed.", error: true });
    setState({ busy: false, message: `${body.recordsChecked} records checked; ${body.newCases} new review case${body.newCases === 1 ? "" : "s"} raised. No records were merged.`, error: false });
    router.refresh();
  }
  return <div className="text-right"><button type="button" onClick={scan} disabled={state.busy} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-950 shadow-sm disabled:opacity-60">{state.busy ? "Checking identities…" : "Run identity check"}</button>{state.message ? <p role={state.error ? "alert" : "status"} className={`mt-2 max-w-md text-xs ${state.error ? "text-red-200" : "text-emerald-100"}`}>{state.message}</p> : null}</div>;
}

export function ReconciliationDecision({ id, candidates }: { id: string; candidates: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [canonicalRecordId, setCanonicalRecordId] = useState(candidates[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(action: "confirm_distinct" | "escalate_merge") {
    setBusy(true); setError("");
    const form = new FormData(); form.set("action", action); form.set("note", note); if (action === "escalate_merge") form.set("canonicalRecordId", canonicalRecordId);
    const response = await fetch(`/api/data-quality/reconciliation/${id}`, { method: "PATCH", body: form });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "The decision could not be recorded."); setBusy(false); return; }
    router.refresh();
  }
  return <div className="mt-4 rounded-xl bg-slate-50 p-4"><label className="block text-xs font-bold text-slate-700">Review rationale<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal" placeholder="Record the evidence checked and why these are distinct, or why a merge review is needed." /></label><label className="mt-3 block text-xs font-bold text-slate-700">Proposed canonical record<select value={canonicalRecordId} onChange={(event) => setCanonicalRecordId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal">{candidates.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{error ? <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} type="button" onClick={() => decide("confirm_distinct")} className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50">Confirm separate people</button><button disabled={busy} type="button" onClick={() => decide("escalate_merge")} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Escalate merge review</button></div><p className="mt-2 text-[11px] leading-4 text-slate-500">Escalation does not merge, delete or overwrite either source record.</p></div>;
}

export function DependencyDecision({ id }: { id: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(status: "APPLIED" | "DISMISSED" | "NOT_APPLICABLE") {
    setBusy(true); setError("");
    const form = new FormData(); form.set("status", status); form.set("decision", decision);
    const response = await fetch(`/api/data-quality/dependencies/${id}`, { method: "PATCH", body: form });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "The dependency decision could not be recorded."); setBusy(false); return; }
    router.refresh();
  }
  return <div className="mt-3"><textarea value={decision} onChange={(event) => setDecision(event.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 p-2 text-xs" placeholder="Record the source record checked or updated and the outcome." />{error ? <p role="alert" className="mt-1 text-xs font-semibold text-red-700">{error}</p> : null}<div className="mt-2 flex flex-wrap gap-2"><button disabled={busy} onClick={() => save("APPLIED")} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Checked / applied</button><button disabled={busy} onClick={() => save("DISMISSED")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold disabled:opacity-50">Dismiss with reason</button><button disabled={busy} onClick={() => save("NOT_APPLICABLE")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold disabled:opacity-50">Not applicable</button></div></div>;
}
