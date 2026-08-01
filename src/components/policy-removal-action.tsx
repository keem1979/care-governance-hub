"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PolicyRemovalAction({ id, title, removed }: { id: string; title: string; removed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update() {
    const confirmed = window.confirm(
      removed
        ? `Restore “${title}” to the active Policy Library?`
        : `Remove “${title}” from the active Policy Library? Its versions and audit history will be retained, and it can be restored later.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("intent", removed ? "restore" : "archive");
    const response = await fetch(`/api/policies/${id}`, { method: "PATCH", body: form });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.error ?? "The policy could not be updated.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  return <div className="flex flex-col items-start gap-1">
    <button type="button" onClick={update} disabled={busy} className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60 ${removed ? "border-emerald-300 bg-white text-emerald-800" : "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"}`}>
      {busy ? "Working…" : removed ? "Restore policy" : "Remove policy"}
    </button>
    {error ? <p role="alert" className="max-w-64 text-xs text-red-700">{error}</p> : null}
  </div>;
}
