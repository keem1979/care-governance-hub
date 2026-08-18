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
      <div className="overflow-x-auto" role="region" aria-label={`${label} editable table`} tabIndex={0}>
        <table className="qcgms-structured-table min-w-max text-left text-xs">
          <thead>
            <tr>
              <th className="w-14 text-center" scope="col">No.</th>
              {columns.map((column) => <th key={column.key} className={widthClass(column.width)} scope="col">{column.label}</th>)}
              <th className="w-20 text-center" scope="col">Remove</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="align-top">
                <th className="text-center text-slate-500" scope="row">{index + 1}</th>
                {columns.map((column) => (
                  <td key={column.key} className={widthClass(column.width)}>
                    <CellInput
                      column={column}
                      value={row[column.key] ?? ""}
                      onChange={(value) => update(index, column.key, value)}
                      rowNumber={index + 1}
                    />
                  </td>
                ))}
                <td className="text-center">
                  <button type="button" onClick={() => remove(index)} className="rounded-lg p-2 text-red-700 transition hover:bg-red-50" aria-label={`Remove row ${index + 1}`}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">Use one row for each distinct item. Scroll sideways on smaller screens; the row number stays visible.</p>
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

function widthClass(width: StructuredTableColumn["width"]) {
  if (width === "compact") return "min-w-28";
  if (width === "wide") return "min-w-64";
  return "min-w-44";
}
