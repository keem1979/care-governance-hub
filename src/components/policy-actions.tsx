"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PolicyActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function act(intent: string) {
    if (intent === "archive" && !window.confirm("Remove this policy from the active Policy Library? Its versions and audit history will be retained, and it can be restored later.")) return;
    if (intent === "restore" && !window.confirm("Restore this policy to the active Policy Library?")) return;
    if (intent === "start-review" && !window.confirm("Start a new review? The current approval will remain in history while this record returns to review.")) return;
    setError(""); setMessage(""); setBusy(intent);
    const form = new FormData(); form.set("intent", intent);
    const response = await fetch(`/api/policies/${id}`, { method: "PATCH", body: form });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? "Action failed."); setBusy(""); return; }
    setMessage(intent === "approve" ? "Approval recorded. Refreshing the policy…" : intent === "archive" ? "Policy removed from the active library. Refreshing…" : intent === "start-review" ? "Review started. Refreshing the policy…" : "Policy restored. Refreshing…");
    setBusy("");
    router.refresh();
  }
  return (
    <div>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap">
        {["DRAFT", "UNDER_REVIEW"].includes(status) && <button disabled={Boolean(busy)} onClick={() => act("approve")} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy === "approve" ? "Recording approval…" : "Record approval"}</button>}
        {status === "APPROVED" && <button disabled={Boolean(busy)} onClick={() => act("start-review")} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy === "start-review" ? "Starting review…" : "Start review"}</button>}
        <button disabled={Boolean(busy)} onClick={() => act(status === "ARCHIVED" ? "restore" : "archive")} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60">
          {busy ? "Working…" : status === "ARCHIVED" ? "Restore policy" : "Remove policy"}
        </button>
      </div>
      {message && <p role="status" className="mt-2 text-sm font-medium text-emerald-700">{message}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function VersionUpload({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(`/api/policies/${id}/versions`, { method: "POST", body: new FormData(event.currentTarget) });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? "Upload failed."); setBusy(false); return; }
    event.currentTarget.reset(); setBusy(false); router.refresh();
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
      <label className="text-sm font-semibold">Version number<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="versionNumber" placeholder="For example, 1.1" required /></label>
      <label className="text-sm font-semibold">Policy document<input className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" name="document" type="file" accept=".pdf,.doc,.docx" required /></label>
      <label className="text-sm font-semibold">What changed?<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="changeNotes" /></label>
      <div className="md:col-span-3"><button disabled={busy} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{busy ? "Uploading…" : "Upload new version"}</button></div>
      {error && <p role="alert" className="md:col-span-3 text-sm text-red-700">{error}</p>}
    </form>
  );
}
