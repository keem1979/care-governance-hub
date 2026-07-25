"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PolicyActions({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function act(intent: string) {
    setError("");
    const form = new FormData(); form.set("intent", intent);
    const response = await fetch(`/api/policies/${id}`, { method: "PATCH", body: form });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? "Action failed."); return; }
    router.refresh();
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {!archived && <button onClick={() => act("approve")} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Record approval</button>}
        <button onClick={() => act(archived ? "restore" : "archive")} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
          {archived ? "Restore policy" : "Archive policy"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
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
      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="versionNumber" placeholder="Version, e.g. 1.1" required />
      <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" name="document" type="file" accept=".pdf,.doc,.docx" required />
      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="changeNotes" placeholder="What changed?" />
      <div className="md:col-span-3"><button disabled={busy} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{busy ? "Uploading…" : "Upload new version"}</button></div>
      {error && <p className="md:col-span-3 text-sm text-red-700">{error}</p>}
    </form>
  );
}
