"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Template = { key: string; title: string; category: string; cqcKey: string; purpose: string; sourceCount: number; exists: boolean };
type Brand = { name?: string; policyBrandName: string | null; policyRegistrationNumber: string | null; policyAddress: string | null; policyEmail: string | null; policyPhone: string | null; policyWebsite: string | null; policyPrimaryColour: string; policyFooterText: string | null };

export function PolicyStudio({ templates, members, brand, canBrand }: { templates: Template[]; members: { id: string; name: string }[]; brand: Brand; canBrand: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const categories = useMemo(() => [...new Set(templates.map((item) => item.category))].sort(), [templates]);
  const visible = templates.filter((item) => (!category || item.category === category) && (!query || `${item.title} ${item.purpose}`.toLowerCase().includes(query.toLowerCase())));
  const availableVisible = visible.filter(({ exists }) => !exists);

  function toggle(key: string) { setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]); }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    selected.forEach((key) => form.append("templateKeys", key));
    const response = await fetch("/api/policies/catalogue", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(result.error ?? "The drafts could not be generated.");
    else { setMessage(`${result.created} policy draft${result.created === 1 ? "" : "s"} created. ${result.skipped ? `${result.skipped} existing policy ${result.skipped === 1 ? "was" : "were"} not duplicated.` : ""}`); setSelected([]); router.refresh(); }
    setBusy(false);
  }

  async function saveBrand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/settings/policy-branding", { method: "PATCH", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? result.message : result.error ?? "Branding could not be saved."); setBusy(false); if (response.ok) router.refresh();
  }

  return <div className="space-y-6">
    <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-950 to-emerald-700 p-6 text-white shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">Premium policy product</p>
      <h1 className="mt-2 text-3xl font-bold">Agency Policy Studio</h1>
      <p className="mt-3 max-w-4xl leading-7 text-emerald-50">Create controlled, source-grounded policy drafts carrying your organisation’s identity. Every policy uses natural paragraphs, includes an evidence annex and enters the normal owner, review and approval workflow.</p>
      <p className="mt-3 max-w-4xl rounded-2xl bg-white/10 p-4 text-sm leading-6 text-emerald-50">These are CQC-aligned working drafts, not a guarantee of compliance or a CQC rating. The Registered Manager must check local safeguarding pathways, commissioning terms, service scope and actual practice before approval.</p>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Identity</p><h2 className="mt-1 text-xl font-bold">Policy branding</h2><p className="mt-1 text-sm text-slate-600">Saved branding appears throughout every newly generated document. Existing drafts keep their controlled wording until deliberately regenerated.</p></div>
      {canBrand ? <form onSubmit={saveBrand} className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Policy brand name" name="policyBrandName" value={brand.policyBrandName ?? ""} required />
        <Field label="CQC or company registration reference" name="policyRegistrationNumber" value={brand.policyRegistrationNumber ?? ""} />
        <Field label="Policy contact email" name="policyEmail" value={brand.policyEmail ?? ""} type="email" />
        <Field label="Policy contact telephone" name="policyPhone" value={brand.policyPhone ?? ""} />
        <Field label="Website" name="policyWebsite" value={brand.policyWebsite ?? ""} placeholder="https://" />
        <label className="text-sm font-semibold text-slate-700">Brand colour<input name="policyPrimaryColour" type="color" defaultValue={brand.policyPrimaryColour} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white p-1" /></label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Registered address<textarea name="policyAddress" defaultValue={brand.policyAddress ?? ""} className={fieldClass} rows={2} /></label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Document footer<textarea name="policyFooterText" defaultValue={brand.policyFooterText ?? ""} className={fieldClass} rows={2} placeholder="Confidential controlled document" /></label>
        <div className="md:col-span-2"><button disabled={busy} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">Save agency branding</button></div>
      </form> : <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">An Organisation Owner can edit branding. You can still generate drafts using the identity already approved for this account.</p>}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Catalogue</p><h2 className="mt-1 text-xl font-bold">Choose controlled drafts</h2><p className="mt-1 text-sm text-slate-600">{templates.length} core adult social care policies. Existing active drafts cannot be duplicated.</p></div><div className="flex gap-2"><button type="button" onClick={() => setSelected(availableVisible.map(({ key }) => key))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Select visible</button><button type="button" onClick={() => setSelected([])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Clear</button></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-[2fr_1fr]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or purpose" className={fieldClass} /><select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}><option value="">All policy areas</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{visible.map((template) => <label key={template.key} className={`rounded-2xl border p-4 ${template.exists ? "border-slate-200 bg-slate-50" : selected.includes(template.key) ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
        <div className="flex items-start gap-3"><input type="checkbox" checked={selected.includes(template.key)} onChange={() => toggle(template.key)} disabled={template.exists} className="mt-1 h-5 w-5 accent-emerald-700" /><div><div className="flex flex-wrap gap-2"><span className="text-xs font-bold uppercase tracking-wider text-emerald-700">{template.category}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">CQC {template.cqcKey}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{template.sourceCount} sources</span></div><h3 className="mt-2 font-bold text-slate-950">{template.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">Designed {template.purpose}.</p>{template.exists ? <p className="mt-2 text-xs font-bold text-slate-500">Already in your Policy Library</p> : null}</div></div>
      </label>)}</div>
      <form onSubmit={generate} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Policy owner<select name="ownerId" required className={fieldClass}><option value="">Choose an accountable owner</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Review cycle<select name="reviewMonths" defaultValue="12" className={fieldClass}><option value="6">Six months</option><option value="12">Twelve months</option><option value="18">Eighteen months</option><option value="24">Twenty-four months</option></select></label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Local drafting instructions<textarea name="customisationNotes" className={fieldClass} rows={3} placeholder="Record the services, local authority pathways, contract requirements or specialisms the policy owner must add before approval." /></label>
        <div className="flex flex-wrap items-center gap-4 md:col-span-2"><button disabled={busy || selected.length === 0} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Creating controlled drafts…" : `Create ${selected.length || "selected"} draft${selected.length === 1 ? "" : "s"}`}</button><p className="text-sm text-slate-600">Every draft starts as not submitted and requires local approval.</p></div>
      </form>
      {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-950" role="status">{message}</p> : null}
    </section>
  </div>;
}

const fieldClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-950";
function Field({ label, name, value, type = "text", required = false, placeholder }: { label: string; name: string; value: string; type?: string; required?: boolean; placeholder?: string }) { return <label className="text-sm font-semibold text-slate-700">{label}<input name={name} defaultValue={value} type={type} required={required} placeholder={placeholder} className={fieldClass} /></label>; }
