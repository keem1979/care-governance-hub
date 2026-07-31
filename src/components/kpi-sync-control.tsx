"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function KpiSyncControl({
  month,
  locationId,
}: {
  month: string;
  locationId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sync(automatic = false) {
    const storageKey = `qcgms-kpi-sync:${month}:${locationId ?? "organisation"}`;
    if (automatic && sessionStorage.getItem(storageKey)) return;
    if (automatic) sessionStorage.setItem(storageKey, "started");
    setBusy(true);
    const form = new FormData();
    form.set("month", month);
    if (locationId) form.set("locationId", locationId);
    const response = await fetch("/api/kpis/sync", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(`${result.updated} figures refreshed from QCGMS records.`);
      router.refresh();
    } else {
      setMessage(result.error ?? "The connected figures could not be refreshed.");
    }
    setBusy(false);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void sync(true), 0);
    return () => window.clearTimeout(timeout);
    // The month and location form a stable refresh key for this page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, locationId]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void sync(false)}
        className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? "Refreshing connected figures…" : "Refresh from QCGMS records"}
      </button>
      {message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
