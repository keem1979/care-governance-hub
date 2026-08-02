"use client";
export function PrintButton() { return <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white print:hidden">Print or save as PDF</button>; }
