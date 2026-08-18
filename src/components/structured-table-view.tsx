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
    <div className="overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      <table className="qcgms-structured-table min-w-max text-left text-xs">
        <thead><tr><th className="w-12 text-center" scope="col">No.</th>{columns.map((column) => <th key={column.key} className={widthClass(column.width)} scope="col">{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index} className="align-top"><th className="text-center text-slate-500" scope="row">{index + 1}</th>{columns.map((column) => <td key={column.key} className={`${widthClass(column.width)} whitespace-pre-wrap`}>{column.type === "checkbox" ? row[column.key] === "Yes" ? <span className="inline-flex items-center gap-1 font-bold text-emerald-800"><Check size={14}/> Yes</span> : <span className="inline-flex items-center gap-1 text-slate-500"><Minus size={14}/> No</span> : row[column.key] || "—"}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function widthClass(width: StructuredTableColumn["width"]) {
  if (width === "compact") return "min-w-24";
  if (width === "wide") return "min-w-56";
  return "min-w-40";
}
