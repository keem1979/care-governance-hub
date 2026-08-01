"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KPI_RESULT_BUTTON_CLASS } from "@/lib/kpi-ui";
import { KPI_SOURCE_OPTIONS } from "@/lib/kpi-sources";

type Definition = {
  id: string;
  name: string;
  unit: string;
  targetValue: number;
  greenThreshold: number;
  amberThreshold: number;
};

export function KpiNeedsEntryButton({ definitionId }: { definitionId: string }) {
  function openEntry() {
    const input = document.getElementById(`kpi-input-${definitionId}`);
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => input?.focus(), 350);
  }

  return (
    <button
      type="button"
      onClick={openEntry}
      aria-label="Open this KPI's monthly entry field"
      className={KPI_RESULT_BUTTON_CLASS}
    >
      Add result
    </button>
  );
}

export function KpiScorecardEntry({
  definition,
  month,
  locationId,
  actualValue,
  notes,
  sourceType,
  sourceUrl,
}: {
  definition: Definition;
  month: string;
  locationId: string | null;
  actualValue?: number;
  notes?: string | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
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
          id={`kpi-input-${definition.id}`}
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
        Where did this figure come from? <span className="text-red-700">Required</span>
        <select name="sourceType" required defaultValue={sourceType ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">
          <option value="" disabled>Select the evidence source</option>
          {KPI_SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Source link <span className="font-normal text-slate-500">(optional)</span>
        <input name="sourceUrl" type="url" defaultValue={sourceUrl ?? ""} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
        <span className="mt-1 block text-xs font-normal text-slate-500">Link to the care system record, report or evidence page. Do not paste passwords.</span>
      </label>
      <label className="block text-sm font-semibold">
        Evidence note or explanation
        <textarea
          name="notes"
          defaultValue={notes?.startsWith("[Auto-synced]") ? "" : notes ?? ""}
          placeholder="Explain the figure, any variance and the check completed."
          className="mt-1 min-h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
        />
      </label>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button
        disabled={busy}
        className={`${KPI_RESULT_BUTTON_CLASS} w-full`}
      >
        {busy ? "Saving…" : actualValue === undefined ? "Save result" : "Update result"}
      </button>
    </form>
  );
}
