"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";

export function AssistantEscalationReview({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget), response = await fetch(`/api/assistant/escalations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: form.get("status"), response: form.get("response") }) }), body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? "The escalation could not be updated."); else router.refresh();
    setBusy(false);
  }
  return <form onSubmit={submit} className="mt-3 grid gap-2"><label className="text-xs font-bold">Management decision<select name="status" className={field}><option value="ACKNOWLEDGED">Acknowledge and investigate</option><option value="RESOLVED">Resolve with guidance</option><option value="DISMISSED">Dismiss with rationale</option></select></label><textarea name="response" required minLength={12} maxLength={3000} rows={3} className={field} placeholder="Record the guidance, action taken or reason for dismissal" />{error ? <p role="alert" className="text-xs font-bold text-red-700">{error}</p> : null}<button disabled={busy} className="w-fit rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy ? "Saving…" : "Record management decision"}</button></form>;
}
