"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REMINDER_OFFSETS } from "@/lib/calendar";

type EventOption = { key: string; title: string; date: string };

export function ReminderForm({ events }: { events: EventOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/calendar/reminders", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Reminder saved." : result.error ?? "Could not save reminder.");
    if (response.ok) router.refresh();
  }
  return <form onSubmit={submit} className="space-y-3">
    <label className="block text-sm font-medium">Calendar event<select name="eventKey" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Choose event</option>{events.map((item) => <option key={item.key} value={item.key}>{item.date} - {item.title}</option>)}</select></label>
    <label className="block text-sm font-medium">Alert time<select name="offsetDays" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" defaultValue="30">{REMINDER_OFFSETS.map((days) => <option key={days} value={days}>{days === -1 ? "When overdue" : days === 0 ? "On due date" : `${days} days before`}</option>)}</select></label>
    <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Set reminder</button>
    {message ? <p className="text-sm text-slate-600" role="status">{message}</p> : null}
  </form>;
}

export function CalendarItemActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function update(intent: string) {
    setBusy(true);
    await fetch(`/api/calendar/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent }) });
    router.refresh();
    setBusy(false);
  }
  return <div className="flex gap-2">
    <button disabled={busy} onClick={() => update(status === "COMPLETED" ? "reopen" : "complete")} className="text-xs font-semibold text-emerald-700">{status === "COMPLETED" ? "Reopen" : "Complete"}</button>
    <button disabled={busy} onClick={() => update("archive")} className="text-xs font-semibold text-red-700">Archive</button>
  </div>;
}
