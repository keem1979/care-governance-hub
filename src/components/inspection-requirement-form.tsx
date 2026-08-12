"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CQC_KEY_QUESTIONS, inspectionLabel } from "@/lib/inspection";
import { CQC_EVIDENCE_CATEGORIES } from "@/lib/inspection-framework";
import { assuranceLabel } from "@/lib/inspection-assurance";
import { FormPurpose } from "@/components/form-purpose";

type Option = { id: string; name: string };
type Initial = { id: string; baseline: boolean; keyQuestion: string; qualityStatement: string; title: string; explanation: string; evidenceExamples: string[]; locationId: string; ownerId: string; reviewDate: string; confidenceNote: string; coveredEvidenceCategories: string[]; strengths: string; areasForImprovement: string; impactOnPeople: string; managementDecision: string; signedOff: boolean; evidenceIds: string[]; auditIds: string[]; registerEntryIds: string[]; actionIds: string[] };

export function InspectionRequirementForm({ members, locations, evidence, audits, registers, actions, initial }: { members: Option[]; locations: Option[]; evidence: Option[]; audits: Option[]; registers: Option[]; actions: Option[]; initial?: Initial }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(initial ? `/api/inspection/${initial.id}` : "/api/inspection", { method: initial ? "PATCH" : "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not save evidence requirement."); setBusy(false); return; }
    router.push(`/inspection/${initial?.id ?? result.id}`); router.refresh();
  }
  return <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <FormPurpose title="Inspection evidence requirement" description="Describe the assurance question in your own service, explain what good evidence would demonstrate and link the real records that support it." steps={["Define the assurance question", "Explain the evidence expected", "Link records and assign review ownership"]} />
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium">Key question<select name="keyQuestion" disabled={initial?.baseline} className={field} defaultValue={initial?.keyQuestion ?? "SAFE"}>{CQC_KEY_QUESTIONS.map((item) => <option key={item} value={item}>{inspectionLabel(item)}</option>)}</select>{initial?.baseline?<input type="hidden" name="keyQuestion" value={initial.keyQuestion}/>:null}</label>
      <label className="text-sm font-medium">Relevant CQC quality statement or internal standard<input name="qualityStatement" readOnly={initial?.baseline} className={field} defaultValue={initial?.qualityStatement} placeholder="For example, Safe systems, pathways and transitions" /></label>
      <label className="text-sm font-medium md:col-span-2">What assurance question must the service answer?<input name="title" readOnly={initial?.baseline} required minLength={3} className={field} defaultValue={initial?.title} placeholder="For example, Are medicines errors recognised, escalated and learned from?" /></label>
      <label className="text-sm font-medium md:col-span-2">What would good evidence demonstrate?<textarea name="explanation" readOnly={initial?.baseline} required minLength={10} className={`${field} min-h-24`} defaultValue={initial?.explanation} placeholder="Describe the process, practice and outcome the evidence should show. This is an internal assurance expectation, not a predicted CQC judgement." /></label>
      <label className="text-sm font-medium md:col-span-2">Evidence examples<p className="text-xs font-normal text-slate-500">One per line or comma-separated.</p><textarea name="evidenceExamples" readOnly={initial?.baseline} className={`${field} min-h-24`} defaultValue={initial?.evidenceExamples.join("\n")} /></label>
      <label className="text-sm font-medium">Location<select name="locationId" className={field} defaultValue={initial?.locationId ?? ""}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Owner<select name="ownerId" className={field} defaultValue={initial?.ownerId ?? ""}><option value="">Unassigned</option>{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Review date<input name="reviewDate" type="date" className={field} defaultValue={initial?.reviewDate} /></label>
      <label className="text-sm font-medium md:col-span-2">Confidence note<textarea name="confidenceNote" className={`${field} min-h-20`} defaultValue={initial?.confidenceNote} placeholder="Internal assurance note and any uncertainty" /></label>
      <Multi label="Documents from Evidence Library" name="evidenceIds" options={evidence} defaults={initial?.evidenceIds ?? []} />
      <Multi label="Audits" name="auditIds" options={audits} defaults={initial?.auditIds ?? []} />
      <Multi label="Register entries" name="registerEntryIds" options={registers} defaults={initial?.registerEntryIds ?? []} />
      <Multi label="Actions" name="actionIds" options={actions} defaults={initial?.actionIds ?? []} />
    </div>
    <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-bold">CQC evidence categories covered</legend><p className="mb-3 text-xs text-slate-500">Tick only categories the RM has checked in the connected evidence. Automatically recognised categories are also included in the calculated assurance.</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{CQC_EVIDENCE_CATEGORIES.map((category)=><label key={category} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm"><input type="checkbox" name="coveredEvidenceCategories" value={category} defaultChecked={initial?.coveredEvidenceCategories.includes(category)}/>{assuranceLabel(category)}</label>)}</div></fieldset>
    <fieldset className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-2"><legend className="px-2 text-sm font-bold text-emerald-950">Registered Manager judgement</legend><label className="text-sm font-medium md:col-span-2">Strengths supported by evidence<textarea name="strengths" className={`${field} min-h-20`} defaultValue={initial?.strengths}/></label><label className="text-sm font-medium">Areas for improvement<textarea name="areasForImprovement" className={`${field} min-h-20`} defaultValue={initial?.areasForImprovement}/></label><label className="text-sm font-medium">Impact on people<textarea name="impactOnPeople" className={`${field} min-h-20`} defaultValue={initial?.impactOnPeople}/></label><label className="text-sm font-medium">Management decision<select name="managementDecision" className={field} defaultValue={initial?.managementDecision??"NOT_REVIEWED"}>{["NOT_REVIEWED","ASSURED","PARTIALLY_ASSURED","NOT_ASSURED","NOT_APPLICABLE"].map((x)=><option key={x} value={x}>{assuranceLabel(x)}</option>)}</select></label><label className="flex items-center gap-2 self-end rounded-lg bg-white p-3 text-sm font-semibold"><input type="checkbox" name="signedOff" value="true" defaultChecked={initial?.signedOff}/>RM sign-off confirmed</label></fieldset>
    <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : initial ? "Save requirement" : "Create requirement"}</button>
  </form>;
}
function Multi({ label, name, options, defaults }: { label: string; name: string; options: Option[]; defaults: string[] }) { return <label className="text-sm font-medium">{label}<p className="text-xs font-normal text-slate-500">Use Ctrl or Command for multiple.</p><select multiple name={name} defaultValue={defaults} className="mt-1 min-h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>; }
