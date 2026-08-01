"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RegisterField } from "@/lib/registers";
import { REGISTER_RISK_LEVELS, REGISTER_STATUSES, registerFormExperience, registerStatusLabel } from "@/lib/registers";

type Option = { id: string; name: string };
type Initial = { id: string; reference: string; eventDate: string; title: string; summary: string; riskLevel: string; status: string; locationId: string; ownerId: string; closureDate: string; data: Record<string, unknown>; evidenceIds: string[] };

export function RegisterEntryForm({ registerKey, registerName, fields, locations, owners, evidence, initial }: { registerKey: string; registerName: string; fields: RegisterField[]; locations: Option[]; owners: Option[]; evidence: { id: string; title: string }[]; initial?: Initial }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const experience = registerFormExperience(registerKey, registerName);
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

  return <form onSubmit={submit} className="space-y-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{initial ? "Update record" : "New record"}</p><h2 className="mt-1 text-lg font-bold">{registerName}</h2><p className="mt-1 text-sm leading-6 text-emerald-950">{experience.detailsIntro}</p><p className="mt-2 text-xs text-emerald-800">Fields marked * are required. Use internal references and only record personal information needed for governance follow-up.</p></section>
    {error ? <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

    <FormSection number="1" title="Identify the record" description="Give the record a clear date, subject and factual account.">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Reference <span className="font-normal text-slate-500">(created automatically if blank)</span><input className={cls} name="reference" defaultValue={initial?.reference} readOnly={Boolean(initial)} placeholder="Leave blank for an automatic reference" /></label>
        <label className="text-sm font-medium">{experience.dateLabel} *<input className={cls} name="eventDate" type="date" defaultValue={initial?.eventDate ?? new Date().toISOString().slice(0, 10)} required /></label>
        <label className="text-sm font-medium md:col-span-2">{experience.titleLabel} *<input className={cls} name="title" defaultValue={initial?.title} required minLength={3} placeholder={experience.titlePlaceholder} /></label>
        <label className="text-sm font-medium md:col-span-2">{experience.summaryLabel} *<textarea className={`${cls} min-h-28`} name="summary" defaultValue={initial?.summary} required placeholder={experience.summaryPlaceholder} /></label>
      </div>
    </FormSection>

    <FormSection number="2" title={`${registerName} information`} description={experience.detailsIntro}>
      <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <DynamicField key={field.key} field={field} value={initial?.data[field.key]} />)}</div>
    </FormSection>

    <FormSection number="3" title="Responsibility and follow-up" description="Assign ownership, rate current risk and keep the workflow status accurate.">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Current risk to people or the service<select className={cls} name="riskLevel" defaultValue={initial?.riskLevel ?? "LOW"}>{REGISTER_RISK_LEVELS.map((value) => <option key={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label>
        <label className="text-sm font-medium">Record status<select className={cls} name="status" defaultValue={initial?.status ?? "OPEN"}>{REGISTER_STATUSES.map((value) => <option key={value} value={value}>{registerStatusLabel(value)}</option>)}</select></label>
        <label className="text-sm font-medium">Service location<select className={cls} name="locationId" defaultValue={initial?.locationId ?? ""}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium">Person responsible for follow-up<select className={cls} name="ownerId" defaultValue={initial?.ownerId ?? ""}><option value="">Choose later</option>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium">Date work was closed<input className={cls} name="closureDate" type="date" defaultValue={initial?.closureDate} /></label>
      </div>
    </FormSection>

    <FormSection number="4" title="Supporting evidence" description="This register entry becomes live evidence automatically. Add documents that support decisions, investigation, outcome or closure.">
      <p className="text-sm text-slate-500">Use Ctrl or Command to select more than one uploaded item. If a document is not listed, save this record and upload it to the Evidence Library.</p>
      <select multiple name="evidenceIds" defaultValue={initial?.evidenceIds ?? []} className={`${cls} min-h-32`}>{evidence.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
    </FormSection>

    <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : initial ? `Save changes to ${registerName.toLowerCase()}` : experience.saveLabel}</button>
  </form>;
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return <section><div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{number}</span><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-0.5 text-sm text-slate-600">{description}</p></div></div><div className="mt-4">{children}</div></section>;
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
