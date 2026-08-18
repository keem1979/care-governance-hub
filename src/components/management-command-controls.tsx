"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DELEGATION_RESPONSIBILITIES, MANAGEMENT_FOCUSES, responsibilityLabel, type ManagementFilters } from "@/lib/management-intelligence";

type Member = { id: string; user: { name: string }; role: { name: string } };
type Location = { id: string; name: string };

export function SaveManagementView({ filters, locations }: { filters: ManagementFilters; locations: Location[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(form: HTMLFormElement) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/management/saved-views", { method: "POST", body: new FormData(form) });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "View saved." : result.error ?? "Could not save the view.");
    setBusy(false);
    if (response.ok) { form.reset(); router.refresh(); }
  }
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
    <input type="hidden" name="view" value={filters.view}/><input type="hidden" name="focus" value={filters.focus}/><input type="hidden" name="locationId" value={filters.locationId ?? ""}/>
    <label className="block text-sm font-semibold">View name<input name="name" required minLength={2} maxLength={60} placeholder="e.g. Monday owner review" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" className="size-4"/> Open this view by default</label>
    <button disabled={busy} className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save current view"}</button>
    {message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}
    {locations.length === 0 ? <p className="text-xs text-amber-800">Add an active location before saving a location command view.</p> : null}
  </form>;
}

export function CreateManagementDelegation({ members, locations, canUseOrganisationScope }: { members: Member[]; locations: Location[]; canUseOrganisationScope: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(form: HTMLFormElement) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/management/delegations", { method: "POST", body: new FormData(form) });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Delegation recorded." : result.error ?? "Could not create the delegation.");
    setBusy(false);
    if (response.ok) { form.reset(); router.refresh(); }
  }
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Delegate to<select name="delegateId" required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Choose team member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.user.name} · {member.role.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Scope<select name="locationId" required={!canUseOrganisationScope} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">{canUseOrganisationScope ? <option value="">Organisation-wide</option> : <option value="">Choose authorised location</option>}{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
    </div>
    <label className="block text-sm font-semibold">Delegation title<input name="title" required minLength={3} maxLength={100} placeholder="e.g. Weekly action follow-up" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label>
    <fieldset><legend className="text-sm font-semibold">Responsibilities</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{DELEGATION_RESPONSIBILITIES.map((value) => <label key={value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" name="responsibilities" value={value} className="size-4"/>{responsibilityLabel(value)}</label>)}</div></fieldset>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Starts<input type="date" name="startsAt" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="text-sm font-semibold">Ends<input type="date" name="endsAt" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label></div>
    <label className="block text-sm font-semibold">Reason<textarea name="reason" required minLength={10} maxLength={500} rows={3} placeholder="Why this responsibility is being delegated and what good handover looks like" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label>
    <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-950"><strong>Access safeguard:</strong> Delegation records accountability only. It never grants permissions or access to another location.</p>
    <button disabled={busy || members.length === 0} className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Recording…" : "Record delegation"}</button>
    {message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}
  </form>;
}

export function RemoveSavedView({ id }: { id: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  return <button disabled={busy} onClick={async () => { setBusy(true); const response = await fetch(`/api/management/saved-views/${id}`, { method: "DELETE" }); setBusy(false); if (response.ok) router.refresh(); }} className="text-xs font-bold text-red-700 disabled:opacity-50">{busy ? "Removing…" : "Remove"}</button>;
}

export function EndDelegation({ id }: { id: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs font-bold text-red-700">End delegation</button>;
  return <form className="mt-2 flex flex-wrap gap-2" onSubmit={async (event) => { event.preventDefault(); setBusy(true); const response = await fetch(`/api/management/delegations/${id}`, { method: "PATCH", body: new FormData(event.currentTarget) }); setBusy(false); if (response.ok) router.refresh(); }}><input name="reason" required minLength={3} placeholder="Reason for ending" className="min-w-48 flex-1 rounded-lg border px-2 py-1.5 text-xs"/><button disabled={busy} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white">Confirm</button><button type="button" onClick={() => setOpen(false)} className="text-xs font-bold">Cancel</button></form>;
}

export const managementFocusOptions = MANAGEMENT_FOCUSES;
