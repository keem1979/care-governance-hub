"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MEMBER_STATUSES, settingLabel } from "@/lib/settings";

type Option = { id: string; name: string };
type Role = Option & { key: string };

function useSubmit(endpoint: string, method: "POST" | "PATCH") {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    const response = await fetch(endpoint, { method, body: new FormData(form) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? "The change could not be saved.");
      setBusy(false);
      return;
    }
    if (method === "POST") form.reset();
    setMessage("Saved.");
    router.refresh();
    setBusy(false);
  }
  return { submit, busy, message };
}

export function OrganisationForm({ name }: { name: string }) {
  const state = useSubmit("/api/settings/organisation", "PATCH");
  return <form onSubmit={state.submit} className="space-y-3"><label className="block text-sm font-medium">Organisation name<input name="name" defaultValue={name} required minLength={3} className={field}/></label><Save state={state}/></form>;
}

export function NewLocationForm() {
  const state = useSubmit("/api/settings/locations", "POST");
  return <form onSubmit={state.submit} className="grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Location name<input name="name" required minLength={3} className={field}/></label><label className="text-sm font-medium">Code<input name="code" required minLength={2} maxLength={16} className={field}/></label><label className="text-sm font-medium md:col-span-2">Address<input name="addressLine1" className={field}/></label><label className="text-sm font-medium">Town<input name="town" className={field}/></label><label className="text-sm font-medium">Postcode<input name="postcode" className={field}/></label><div className="md:col-span-2"><Save state={state} label="Add location"/></div></form>;
}

export function LocationForm({ location }: { location: { id: string; name: string; code: string; addressLine1: string | null; town: string | null; postcode: string | null; isActive: boolean } }) {
  const state = useSubmit(`/api/settings/locations/${location.id}`, "PATCH");
  return <form onSubmit={state.submit} className="grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Name<input name="name" defaultValue={location.name} required className={field}/></label><label className="text-sm font-medium">Code<input name="code" defaultValue={location.code} required className={field}/></label><label className="text-sm font-medium md:col-span-2">Address<input name="addressLine1" defaultValue={location.addressLine1 ?? ""} className={field}/></label><label className="text-sm font-medium">Town<input name="town" defaultValue={location.town ?? ""} className={field}/></label><label className="text-sm font-medium">Postcode<input name="postcode" defaultValue={location.postcode ?? ""} className={field}/></label><input type="hidden" name="intent" value="update"/><div className="flex items-center gap-4 md:col-span-2"><Save state={state}/><button type="button" disabled={state.busy} onClick={(event) => { const form = event.currentTarget.form!; (form.elements.namedItem("intent") as HTMLInputElement).value = location.isActive ? "archive" : "restore"; form.requestSubmit(); }} className="text-sm font-semibold text-red-700">{location.isActive ? "Archive location" : "Restore location"}</button></div></form>;
}

export function NewMemberForm({ roles, locations }: { roles: Role[]; locations: Option[] }) {
  const state = useSubmit("/api/settings/members", "POST");
  return <form onSubmit={state.submit} className="grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Full name<input name="name" required minLength={2} className={field}/></label><label className="text-sm font-medium">Email<input name="email" type="email" required className={field}/></label><label className="text-sm font-medium">Role<select name="roleId" required className={field}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label className="text-sm font-medium">Temporary password<input name="temporaryPassword" type="password" autoComplete="new-password" className={field}/><span className="mt-1 block text-xs font-normal text-slate-500">Required only for a new account; at least 12 characters, mixed case and a number.</span></label><label className="flex items-center gap-2 text-sm font-medium md:col-span-2"><input name="allLocations" type="checkbox"/>Access all locations</label><fieldset className="md:col-span-2"><legend className="text-sm font-medium">Assigned locations</legend><div className="mt-2 flex flex-wrap gap-3">{locations.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input name="locationIds" value={item.id} type="checkbox"/>{item.name}</label>)}</div></fieldset><div className="md:col-span-2"><Save state={state} label="Add user"/></div></form>;
}

export function MemberForm({ membership, roles, locations, currentUserId }: { membership: { id: string; user: { id: string; name: string; email: string }; roleId: string; status: string; allLocations: boolean; locations: { locationId: string }[] }; roles: Role[]; locations: Option[]; currentUserId: string }) {
  const state = useSubmit(`/api/settings/members/${membership.id}`, "PATCH");
  const self = membership.user.id === currentUserId;
  return <form onSubmit={state.submit} className="grid gap-3 md:grid-cols-2"><div className="md:col-span-2"><p className="font-bold">{membership.user.name}{self ? " (you)" : ""}</p><p className="text-sm text-slate-500">{membership.user.email}</p></div><label className="text-sm font-medium">Role<select name="roleId" defaultValue={membership.roleId} disabled={self} className={field}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>{self ? <input type="hidden" name="roleId" value={membership.roleId}/> : null}</label><label className="text-sm font-medium">Status<select name="status" defaultValue={membership.status} disabled={self} className={field}>{MEMBER_STATUSES.map((status) => <option key={status} value={status}>{settingLabel(status)}</option>)}</select>{self ? <input type="hidden" name="status" value={membership.status}/> : null}</label><label className="flex items-center gap-2 text-sm font-medium md:col-span-2"><input name="allLocations" type="checkbox" defaultChecked={membership.allLocations} disabled={self}/>Access all locations</label>{self && membership.allLocations ? <input type="hidden" name="allLocations" value="on"/> : null}<fieldset className="md:col-span-2" disabled={self}><legend className="text-sm font-medium">Assigned locations</legend><div className="mt-2 flex flex-wrap gap-3">{locations.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input name="locationIds" value={item.id} type="checkbox" defaultChecked={membership.locations.some(({ locationId }) => locationId === item.id)}/>{item.name}</label>)}</div></fieldset>{self ? membership.locations.map(({ locationId }) => <input key={locationId} type="hidden" name="locationIds" value={locationId}/>) : null}<div className="md:col-span-2"><Save state={state}/></div></form>;
}

function Save({ state, label = "Save changes" }: { state: { busy: boolean; message: string }; label?: string }) { return <div className="flex items-center gap-3"><button disabled={state.busy} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">{state.busy ? "Saving..." : label}</button>{state.message ? <p role="status" className={`text-sm ${state.message === "Saved." ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p> : null}</div>; }
const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100";
