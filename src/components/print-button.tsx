"use client";
import { useState } from "react";

export function PrintButton({ policyId }: { policyId: string }) {
  const [busy, setBusy] = useState(false);
  async function print() {
    setBusy(true);
    const response = await fetch(`/api/policies/${policyId}/access`, { method: "POST" });
    setBusy(false);
    if (response.ok) window.print();
  }
  return <button type="button" onClick={print} disabled={busy} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60 print:hidden">{busy ? "Preparing licensed copy…" : "Print or save as PDF"}</button>;
}
