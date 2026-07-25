"use client";

export function ReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
    >
      Print / save PDF
    </button>
  );
}
