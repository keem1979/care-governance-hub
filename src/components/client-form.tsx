"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CLIENT_STATUSES, clientLabel } from "@/lib/clients";

type Option = { id: string; name: string };
const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";

export function ClientForm({ locations }: { locations: Option[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch("/api/clients", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not add the client record."); setBusy(false); return; }
    router.push(`/clients/${result.id}`); router.refresh();
  }
  return <form onSubmit={submit} className="space-y-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Controlled client record</p><h2 className="mt-1 text-lg font-bold">Add a person receiving support</h2><p className="mt-1 text-sm leading-6 text-emerald-950">This profile makes the person available in assessments, reviews and operational records. Fields marked * are required.</p></section>
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <Section title="Identity and service" description="Use your internal reference so records can be traced without repeating unnecessary personal details.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-semibold">Client number and reference</p><p className="mt-1 text-slate-600">Generated automatically when this record is saved, beginning at Client 1.</p></div>
        <Label title="Service location"><select className={field} name="locationId" defaultValue=""><option value="">Organisation-wide</option>{locations.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Label>
        <Label title="First name *"><input className={field} name="firstName" required maxLength={80}/></Label>
        <Label title="Last name *"><input className={field} name="lastName" required maxLength={80}/></Label>
        <Label title="Preferred name"><input className={field} name="preferredName" maxLength={80}/></Label>
        <Label title="Pronouns"><input className={field} name="pronouns" maxLength={50}/></Label>
        <Label title="Date of birth"><input className={field} name="dateOfBirth" type="date"/></Label>
        <Label title="Client status"><select className={field} name="status" defaultValue="ACTIVE">{CLIENT_STATUSES.map((x)=><option key={x} value={x}>{clientLabel(x)}</option>)}</select></Label>
        <Label title="Service start date"><input className={field} name="serviceStartDate" type="date"/></Label>
        <Label title="Commissioner reference"><input className={field} name="commissionerReference" maxLength={80}/></Label>
      </div>
    </Section>
    <Section title="Contact and communication" description="Record only current information needed to coordinate the service safely.">
      <div className="grid gap-4 md:grid-cols-2">
        <Label title="Phone"><input className={field} name="phone" type="tel" maxLength={40}/></Label>
        <Label title="Email"><input className={field} name="email" type="email" maxLength={160}/></Label>
        <Label title="Address" wide><input className={field} name="addressLine" maxLength={200}/></Label>
        <Label title="Town"><input className={field} name="town" maxLength={100}/></Label>
        <Label title="Postcode"><input className={field} name="postcode" maxLength={20}/></Label>
        <Label title="Communication needs and preferences" wide><textarea className={`${field} min-h-24`} name="communicationSummary" maxLength={1500}/></Label>
        <Label title="Emergency contact summary" wide><textarea className={`${field} min-h-20`} name="emergencyContact" maxLength={1000}/></Label>
      </div>
    </Section>
    <Section title="Next of kin or representative" description="Record who may be contacted and whether they have any documented legal authority. Being next of kin does not automatically give decision-making authority.">
      <div className="grid gap-4 md:grid-cols-2">
        <Label title="Full name"><input className={field} name="nextOfKinName" maxLength={160}/></Label>
        <Label title="Relationship to the person"><input className={field} name="nextOfKinRelationship" maxLength={100}/></Label>
        <Label title="Phone"><input className={field} name="nextOfKinPhone" type="tel" maxLength={40}/></Label>
        <Label title="Email"><input className={field} name="nextOfKinEmail" type="email" maxLength={160}/></Label>
        <Label title="Address" wide><textarea className={`${field} min-h-20`} name="nextOfKinAddress" maxLength={500}/></Label>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input className="mt-1 size-4" type="checkbox" name="nextOfKinContactAllowed" value="true"/><span><strong>Permission to contact recorded</strong><span className="mt-1 block text-xs text-slate-500">Confirm the person’s preference or another lawful basis before routine contact.</span></span></label>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input className="mt-1 size-4" type="checkbox" name="nextOfKinHasAuthority" value="true"/><span><strong>Documented authority recorded</strong><span className="mt-1 block text-xs text-slate-500">For example, a relevant lasting power of attorney. Verify the source document.</span></span></label>
        <Label title="Authority, limits and source document" wide><textarea className={`${field} min-h-20`} name="nextOfKinAuthorityDetails" maxLength={1000} placeholder="State the type of authority, decisions covered, limits and where verification is held."/></Label>
      </div>
    </Section>
    <p className="text-xs leading-5 text-slate-500">Keep this directory proportionate. Clinical detail belongs in the approved care-record system; this governance profile links assessments, reviews and assurance records.</p>
    <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Add client record"}</button>
  </form>;
}

function Section({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <section><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p><div className="mt-4">{children}</div></section>}
function Label({title,wide=false,children}:{title:string;wide?:boolean;children:React.ReactNode}){return <label className={`text-sm font-medium ${wide?"md:col-span-2":""}`}>{title}{children}</label>}
