"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CALENDAR_ITEM_TYPES, calendarLabel } from "@/lib/calendar";

type Option = { id: string; name: string };

export function CalendarItemForm({ members, locations }: { members: Option[]; locations: Option[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/calendar", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not create calendar deadline.");
      setBusy(false);
      return;
    }
    router.push("/calendar?view=agenda");
    router.refresh();
  }
  return <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium md:col-span-2">Title<input name="title" required minLength={3} className={field} placeholder="e.g. Public liability insurance renewal" /></label>
      <label className="text-sm font-medium">Deadline type<select name="itemType" className={field} defaultValue="CERTIFICATE_EXPIRY">{CALENDAR_ITEM_TYPES.map((item) => <option key={item} value={item}>{calendarLabel(item)}</option>)}</select></label>
      <label className="text-sm font-medium">Due date<input name="dueDate" type="date" required className={field} /></label>
      <label className="text-sm font-medium">Service location<select name="locationId" className={field} defaultValue=""><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Owner<select name="ownerId" className={field} defaultValue=""><option value="">Unassigned</option>{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Risk level<select name="riskLevel" className={field} defaultValue=""><option value="">Not rated</option>{["LOW", "MODERATE", "HIGH", "CRITICAL"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-medium md:col-span-2">Description<textarea name="description" className={`${field} min-h-24`} placeholder="Renewal steps, certificate details or other context" /></label>
    </div>
    <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Add deadline"}</button>
  </form>;
}
