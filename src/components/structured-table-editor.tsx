"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  emptyStructuredTableRow,
  parseStructuredTable,
  structuredTableRowHasValue,
  type StructuredTableColumn,
  type StructuredTableRow,
} from "@/lib/care-plan-review-tables";

export function StructuredTableEditor({
  name,
  label,
  description,
  columns,
  defaultValue,
  addLabel = "Add row",
}: {
  name: string;
  label: string;
  description: string;
  columns: readonly StructuredTableColumn[];
  defaultValue?: unknown;
  addLabel?: string;
}) {
  const initialRows = useMemo(() => parseStructuredTable(defaultValue, columns), [columns, defaultValue]);
  const [rows, setRows] = useState<StructuredTableRow[]>(() => initialRows.length ? initialRows : [emptyStructuredTableRow(columns)]);
  const savedRows = rows.filter(structuredTableRowHasValue);

  function update(index: number, key: string, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  function remove(index: number) {
    setRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [emptyStructuredTableRow(columns)];
    });
  }

  return (
    <fieldset className="md:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <input type="hidden" name={name} value={JSON.stringify(savedRows)} />
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50/70 px-4 py-4 sm:px-5">
        <div>
          <legend className="text-sm font-bold text-slate-950">{label}</legend>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
            {savedRows.length} recorded
          </span>
          <button
            type="button"
            onClick={() => setRows((current) => [...current, emptyStructuredTableRow(columns)])}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900"
          >
            <Plus size={15} aria-hidden="true" /> {addLabel}
          </button>
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5" role="group" aria-label={`${label} editable records`}>
        {rows.map((row, index) => (
          <article key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-900">{index + 1}</span>
                <div><h3 className="text-sm font-bold text-slate-950">{label.replace(/ table$/i, "")} record</h3><p className="text-[11px] text-slate-500">Complete the relevant fields below</p></div>
              </div>
              <button type="button" onClick={() => remove(index)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50" aria-label={`Remove record ${index + 1}`}>
                <Trash2 size={15} aria-hidden="true" /> <span className="hidden sm:inline">Remove</span>
              </button>
            </header>
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {columns.map((column) => (
                <div key={column.key} className={fieldSpan(column.width)}>
                  <p className="mb-1.5 text-xs font-bold text-slate-700">{column.label}</p>
                  <CellInput
                    column={column}
                    value={row[column.key] ?? ""}
                    onChange={(value) => update(index, column.key, value)}
                    rowNumber={index + 1}
                  />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">Use one numbered record for each distinct item. The layout automatically adapts to desktop, tablet and mobile screens.</p>
    </fieldset>
  );
}

function CellInput({ column, value, onChange, rowNumber }: { column: StructuredTableColumn; value: string; onChange: (value: string) => void; rowNumber: number }) {
  const label = `${column.label}, row ${rowNumber}`;
  const inputClass = "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-950 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-600";
  if (column.type === "select") return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}><option value="">Choose…</option>{column.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (column.type === "checkbox") return <label className="mx-auto flex w-fit cursor-pointer flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-emerald-50"><input aria-label={label} type="checkbox" checked={value === "Yes"} onChange={(event) => onChange(event.target.checked ? "Yes" : "")} className="size-4 accent-emerald-700"/><span>{value === "Yes" ? "Yes" : "No"}</span></label>;
  if (column.type === "textarea") return <textarea aria-label={label} rows={2} value={value} placeholder={column.placeholder} onChange={(event) => onChange(event.target.value)} className={`${inputClass} min-h-20 resize-y`} />;
  return <input aria-label={label} type={column.type === "date" || column.type === "datetime-local" ? column.type : "text"} value={value} placeholder={column.placeholder} onChange={(event) => onChange(event.target.value)} className={inputClass} />;
}

function fieldSpan(width: StructuredTableColumn["width"]) {
  if (width === "wide") return "md:col-span-2";
  return "";
}
