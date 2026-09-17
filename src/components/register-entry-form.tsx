"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthorisedAsyncMultiSelect } from "@/components/authorised-async-selector";
import type { RegisterField } from "@/lib/registers";
import { REGISTER_RISK_LEVELS, REGISTER_STATUSES, registerFormExperience, registerStatusLabel } from "@/lib/registers";

type Option = { id: string; name: string };
type Initial = { id: string; reference: string; eventDate: string; title: string; summary: string; riskLevel: string; status: string; locationId: string; ownerId: string; clientId: string; staffMemberId: string; closureDate: string; data: Record<string, unknown>; evidenceIds: string[] };
type KnownContext = { organisationName: string; recordedBy: string; locationName: string };
type EvidenceOption = { id: string; title: string; category?: string };

export function RegisterEntryForm({ registerKey, registerName, fields, locations, owners, clients, staff, evidence, clientRequired=false, defaultClientId="", defaultLocationId="", defaultOwnerId="", knownContext, initial }: { registerKey: string; registerName: string; fields: RegisterField[]; locations: Option[]; owners: Option[]; clients: Option[]; staff: Option[]; evidence: EvidenceOption[]; clientRequired?: boolean; defaultClientId?: string; defaultLocationId?: string; defaultOwnerId?: string; knownContext?: KnownContext; initial?: Initial }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locationId, setLocationId] = useState(initial?.locationId ?? defaultLocationId);
  const experience = registerFormExperience(registerKey, registerName);
  const assuredRegister = ["incidents", "complaints", "safeguarding"].includes(registerKey);
  const statusOptions = assuredRegister ? (initial?.status === "CLOSED" ? ["CLOSED"] : REGISTER_STATUSES.filter((value) => value !== "CLOSED")) : REGISTER_STATUSES;
  const requiredFields = fields.filter((field) => field.required);
  const laterFields = fields.filter((field) => !field.required);
  const cls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch(initial ? `/api/registers/${registerKey}/${initial.id}` : `/api/registers/${registerKey}`, { method: initial ? "PATCH" : "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? `Could not save this ${registerName.toLowerCase()} record.`);
      setBusy(false);
      return;
    }
    router.push(`/registers/${registerKey}/${initial?.id ?? result.id}`);
    router.refresh();
  }

  return <form onSubmit={submit} className="space-y-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{initial ? "Update record" : "Required now"}</p><h2 className="mt-1 text-lg font-bold">{registerName}</h2><p className="mt-1 text-sm leading-6 text-emerald-950">{initial ? experience.detailsIntro : "Record what is known now. Investigation, evidence, actions and assurance can be completed from the saved record."}</p><p className="mt-2 text-xs text-emerald-800">Fields marked * are required. QCGMS creates the reference and preserves the record history.</p></section>
    {error ? <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

    {!initial && knownContext ? <section aria-label="Known record context" className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <Known label="Organisation" value={knownContext.organisationName} />
      <Known label="Recorded by" value={knownContext.recordedBy} />
      <Known label="Recorded at" value="When you save" />
      <Known label="Default scope" value={knownContext.locationName} />
    </section> : null}

    <FormSection number="1" title="What happened?" description="Add the minimum factual information needed to create a safe governance record.">
      <div className="grid gap-4 md:grid-cols-2">
        {initial ? <label className="text-sm font-medium">Reference<input className={`${cls} bg-slate-50`} name="reference" defaultValue={initial.reference} readOnly /></label> : <input type="hidden" name="reference" value="" />}
        <label className="text-sm font-medium">{experience.dateLabel} *<input className={cls} name="eventDate" type="date" defaultValue={initial?.eventDate ?? new Date().toISOString().slice(0, 10)} required /></label>
        <label className="text-sm font-medium md:col-span-2">{experience.titleLabel} *<input className={cls} name="title" defaultValue={initial?.title} required minLength={3} placeholder={experience.titlePlaceholder} /></label>
        <label className="text-sm font-medium md:col-span-2">{experience.summaryLabel} *<textarea className={`${cls} min-h-28`} name="summary" defaultValue={initial?.summary} required placeholder={experience.summaryPlaceholder} /></label>
        <DirectorySelect name="clientId" label="Person/client this record relates to" options={clients} initialId={initial?.clientId||defaultClientId} required={clientRequired} help="Type a name or reference, then choose the person. The record will appear on their Client Directory profile."/>
        <DirectorySelect name="staffMemberId" label="Staff member involved or being reviewed" options={staff} initialId={initial?.staffMemberId??""} help="Type a name or employee reference, then choose the worker from Workforce Compliance."/>
      </div>
    </FormSection>

    {initial || requiredFields.length ? <FormSection number="2" title={initial ? `${registerName} information` : "What else is required now?"} description={initial ? experience.detailsIntro : "Only the fields needed to create this record are shown here."}>
      <div className="grid gap-4 md:grid-cols-2">{(initial ? fields : requiredFields).map((field) => <DynamicField key={field.key} field={field} value={initial?.data[field.key]} />)}</div>
    </FormSection> : null}

    {!initial && laterFields.length ? <details className="rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-semibold text-slate-900">Add information already known <span className="font-normal text-slate-500">(optional)</span></summary><p className="mt-2 text-sm text-slate-600">These details can also be added later from the saved record. Do not delay initial capture to complete them.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{laterFields.map((field) => <DynamicField key={field.key} field={field} value={undefined} />)}</div></details> : null}

    <FormSection number="3" title="Responsibility and immediate risk" description="QCGMS has selected safe defaults. Change them only when the record needs a different owner or scope.">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Current risk to people or the service<select className={cls} name="riskLevel" defaultValue={initial?.riskLevel ?? "LOW"}>{REGISTER_RISK_LEVELS.map((value) => <option key={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label>
        {assuredRegister && !initial ? <input type="hidden" name="status" value="OPEN" /> : <label className="text-sm font-medium">Record status<select className={cls} name="status" defaultValue={initial?.status ?? "OPEN"}>{statusOptions.map((value) => <option key={value} value={value}>{registerStatusLabel(value)}</option>)}</select>{assuredRegister ? <span className="mt-1 block text-xs font-normal text-slate-500">Closure and reopening are controlled by the Management Assurance Test on this record’s page.</span> : null}</label>}
        <label className="text-sm font-medium">Service location<select className={cls} name="locationId" value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium">Person responsible for follow-up<select className={cls} name="ownerId" defaultValue={initial?.ownerId ?? defaultOwnerId}><option value="">Choose later</option>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {!assuredRegister ? <label className="text-sm font-medium">Date work was closed<input className={cls} name="closureDate" type="date" defaultValue={initial?.closureDate} /></label> : null}
      </div>
    </FormSection>

    <FormSection number="4" title="Link evidence already held" description="Evidence is optional at first capture. Link governed records now when they are already available; otherwise continue after saving.">
      <AuthorisedAsyncMultiSelect name="evidenceIds" label="Find existing Evidence" kind="EVIDENCE" initialOptions={evidence.map((item) => ({ id: item.id, name: item.title, meta: item.category }))} defaultValues={initial?.evidenceIds ?? []} locationId={locationId} placeholder="Search title, category, type or source reference" endpoint="/api/evidence/authorised-options" />
      <p className="mt-2 text-xs text-slate-500">Search the governed Evidence Library first. Upload a new record only when the Evidence is genuinely new.</p>
    </FormSection>

    <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : initial ? `Save changes to ${registerName.toLowerCase()}` : experience.saveLabel}</button>
  </form>;
}

function Known({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>;
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return <section><div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{number}</span><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-0.5 text-sm text-slate-600">{description}</p></div></div><div className="mt-4">{children}</div></section>;
}

function DirectorySelect({name,label,options,initialId="",required=false,help}:{name:string;label:string;options:Option[];initialId?:string;required?:boolean;help:string}){
  const initial=options.find((item)=>item.id===initialId);
  const [text,setText]=useState(initial?.name??"");
  const match=options.find((item)=>item.name===text);
  const listId=`${name}-options`;
  return <label className="text-sm font-medium">{label}{required?" *":""}<input className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" list={listId} value={text} onChange={(event)=>setText(event.target.value)} placeholder="Start typing a name or reference" required={required}/><input type="hidden" name={name} value={match?.id??""}/><datalist id={listId}>{options.map((item)=><option key={item.id} value={item.name}/>)}</datalist><span className="mt-1 block text-xs font-normal text-slate-500">{help}</span>{text&&!match?<span className="mt-1 block text-xs font-semibold text-amber-700">Choose an exact match from the list to link this record.</span>:null}</label>
}

function DynamicField({ field, value }: { field: RegisterField; value: unknown }) {
  const cls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
  const prompt = fieldPrompt(field);
  if (field.type === "select") return <label className="text-sm font-medium">{field.label}{field.required ? " *" : ""}<select className={cls} name={`field_${field.key}`} defaultValue={String(value ?? "")} required={field.required}><option value="">Choose an option</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">{prompt.help}</span></label>;
  if (field.type === "boolean") return <label className="text-sm font-medium">{field.label}{field.required ? " *" : ""}<select className={cls} name={`field_${field.key}`} defaultValue={String(value ?? false)}><option value="false">No</option><option value="true">Yes</option></select><span className="mt-1 block text-xs font-normal text-slate-500">{prompt.help}</span></label>;
  if (field.type === "textarea") return <label className="text-sm font-medium md:col-span-2">{field.label}{field.required ? " *" : ""}<textarea className={`${cls} min-h-24`} name={`field_${field.key}`} defaultValue={String(value ?? "")} required={field.required} placeholder={prompt.placeholder} /><span className="mt-1 block text-xs font-normal text-slate-500">{prompt.help}</span></label>;
  return <label className="text-sm font-medium">{field.label}{field.required ? " *" : ""}<input className={cls} name={`field_${field.key}`} type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} min={field.type === "number" ? 0 : undefined} defaultValue={String(value ?? "")} required={field.required} placeholder={field.type === "text" ? prompt.placeholder : undefined} /><span className="mt-1 block text-xs font-normal text-slate-500">{prompt.help}</span></label>;
}

function fieldPrompt(field: RegisterField) {
  const key = field.key.toLowerCase();
  if (key.includes("reference")) return { placeholder: "Use an internal reference, not a full name", help: "Use the identifier your team can trace securely." };
  if (key.includes("score")) return { placeholder: "Enter a percentage from 0 to 100", help: "Use the calculated result from the reviewed sample." };
  if (key.includes("learning") || key.includes("lessons")) return { placeholder: "What should be retained, changed or shared?", help: "Record practical learning and who needs to know." };
  if (key.includes("outcome")) return { placeholder: "Record the decision, result and any follow-up needed", help: "Make the final position and next step clear." };
  if (key.includes("action") || key.includes("findings")) return { placeholder: "Describe the finding, owner, deadline and required evidence", help: "Create a linked Action Tracker item after saving when formal follow-up is needed." };
  if (key.includes("instructions")) return { placeholder: "Record the current instruction, limits and escalation route", help: "Use the approved clinical instruction; do not invent clinical guidance." };
  if (key.includes("progress")) return { placeholder: "What has changed and what evidence supports this?", help: "Include the person’s experience and measurable progress where possible." };
  return { placeholder: `Enter ${field.label.toLowerCase()}`, help: field.type === "date" ? "Use the date shown on the source record." : field.type === "number" ? "Enter the verified total for this record." : "Use clear, factual wording." };
}
