"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Definition = {
  id: string;
  name: string;
  unit: string;
  targetValue: number;
  greenThreshold: number;
  amberThreshold: number;
};

export function KpiScorecardEntry({
  definition,
  month,
  locationId,
  actualValue,
  notes,
}: {
  definition: Definition;
  month: string;
  locationId: string | null;
  actualValue?: number;
  notes?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/kpis", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "This figure could not be saved.");
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="kpiId" value={definition.id} />
      <input type="hidden" name="reportingMonth" value={month} />
      <input type="hidden" name="locationId" value={locationId ?? ""} />
      <input type="hidden" name="targetValue" value={definition.targetValue} />
      <input type="hidden" name="greenThreshold" value={definition.greenThreshold} />
      <input type="hidden" name="amberThreshold" value={definition.amberThreshold} />
      <label className="block text-sm font-semibold">
        This month’s verified result ({definition.unit})
        <input
          name="actualValue"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={actualValue}
          placeholder={`Enter ${definition.name.toLowerCase()}`}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block text-sm font-semibold">
        Explanation or source
        <textarea
          name="notes"
          defaultValue={notes?.startsWith("[Auto-synced]") ? "" : notes ?? ""}
          placeholder="Explain the figure, variance or source used."
          className="mt-1 min-h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
        />
      </label>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button
        disabled={busy}
        className="w-full rounded-lg border border-emerald-700 px-3 py-2 text-sm font-bold text-emerald-800 disabled:opacity-60"
      >
        {busy ? "Saving…" : actualValue === undefined ? "Save this figure" : "Update this figure"}
      </button>
    </form>
  );
}
