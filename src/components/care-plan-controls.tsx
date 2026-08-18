"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishCarePlan({ id, versionId, defaultDecision }: { id: string; versionId: string; defaultDecision: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function publish() { setBusy(true); setError(""); const form = new FormData(); form.set("versionId", versionId); form.set("decision", defaultDecision); const response = await fetch(`/api/care-plans/${id}/publish`, { method: "POST", body: form }); const body = await response.json().catch(() => ({})); if (!response.ok) { setError(body.error ?? "Could not publish."); setBusy(false); return; } router.refresh(); }
  return <div>{error ? <p role="alert" className="mb-2 max-w-xl rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">{error}</p> : null}<button type="button" disabled={busy} onClick={publish} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Publishing…" : "Approve and publish"}</button></div>;
}

export function AcknowledgeCarePlan(props: { id: string; staff?: { id: string; name: string }[] }) {
  const { id } = props;
  const router = useRouter(); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [understanding, setUnderstanding] = useState(false); const [error, setError] = useState("");
  async function acknowledge() { setBusy(true); setError(""); const response = await fetch(`/api/care-plans/${id}/acknowledge`, { method: "POST", body: new FormData() }); const body = await response.json().catch(() => ({})) as { error?: string; understandingRequired?: boolean }; if (!response.ok) { setError(body.error ?? "Could not acknowledge."); setBusy(false); return; } setDone(true); setUnderstanding(Boolean(body.understandingRequired)); setBusy(false); router.refresh(); }
  return <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><h3 className="font-bold text-amber-950">Read the approved current version</h3><p className="mt-1 text-sm text-amber-900">Confirm only after reading the live instructions. The system links this decision to your signed-in account; another staff profile cannot be selected.</p>{error ? <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}<button type="button" onClick={acknowledge} disabled={busy || done} className="mt-3 rounded-lg bg-amber-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{done ? "Acknowledged" : busy ? "Recording…" : "Confirm read and understood"}</button>{understanding ? <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold text-amber-950">This version contains a safety-related change. Complete the understanding check below; a different authorised manager must review it.</p> : null}</div>;
}
