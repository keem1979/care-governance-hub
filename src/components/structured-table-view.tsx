import { Check, Minus } from "lucide-react";
import { parseStructuredTable, type StructuredTableColumn } from "@/lib/care-plan-review-tables";

export function StructuredTableView({
  label,
  value,
  columns,
}: {
  label: string;
  value: unknown;
  columns: readonly StructuredTableColumn[];
}) {
  const rows = parseStructuredTable(value, columns);
  if (!rows.length) return <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No {label.toLowerCase()} rows recorded.</p>;

  return (
    <div className="space-y-3" aria-label={label}>
      {rows.map((row, index) => <article key={index} className="break-inside-avoid overflow-hidden rounded-xl border border-slate-200 bg-white"><header className="flex items-center gap-2 border-b border-slate-200 bg-emerald-50 px-3 py-2"><span className="grid size-6 place-items-center rounded-full bg-emerald-800 text-[10px] font-black text-white">{index + 1}</span><h3 className="text-xs font-bold text-emerald-950">{label.replace(/ table$/i, "")} record</h3></header><dl className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">{columns.map((column) => <div key={column.key} className={`${fieldSpan(column.width)} bg-white p-3`}><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{column.label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{column.type === "checkbox" ? row[column.key] === "Yes" ? <span className="inline-flex items-center gap-1 font-bold text-emerald-800"><Check size={14}/> Yes</span> : <span className="inline-flex items-center gap-1 text-slate-500"><Minus size={14}/> No</span> : row[column.key] || "—"}</dd></div>)}</dl></article>)}
    </div>
  );
}

function fieldSpan(width: StructuredTableColumn["width"]) {
  if (width === "wide") return "sm:col-span-2";
  return "";
}
