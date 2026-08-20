"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MEASURE_DEFINITIONS, MEASURE_TYPES, type MeasureType } from "@/lib/launch-readiness";

type MessageState = { busy: boolean; message: string; error: boolean };
const initial: MessageState = { busy: false, message: "", error: false };

function useJsonAction(endpoint: string, method: "POST" | "PATCH" | "PUT" = "POST") {
  const router = useRouter(), [state, setState] = useState<MessageState>(initial);
  async function run(payload: unknown) {
    setState({ busy: true, message: "", error: false });
    const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    setState({ busy: false, message: response.ok ? result.message ?? "Saved." : result.error ?? "The change could not be saved.", error: !response.ok });
    if (response.ok) router.refresh();
    return response.ok;
  }
  return { ...state, run };
}

export function CreatePilotForm() {
  const action = useJsonAction("/api/launch-readiness/pilots");
  return <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run(Object.fromEntries(form)); }} className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Text name="name" label="Pilot name" placeholder="External provider pilot 01" />
      <Select name="cohort" label="Pilot cohort" options={["INTERNAL_DBAM", "EXTERNAL_PROVIDER"]} />
      <Text name="serviceType" label="Service type" placeholder="Domiciliary care" />
      <NumberInput name="locationCount" label="Locations in scope" min={1} max={1000} />
      <DateInput name="startDate" label="Start date" />
      <DateInput name="targetEndDate" label="Target end date" />
      <Area name="primaryOutcome" label="Primary outcome" placeholder="State the single operational outcome this pilot is intended to test." />
      <Area name="successCriteria" label="Pre-agreed success criteria" placeholder="Define the calculation, threshold and observation window before the pilot starts." />
      <Area name="riskControls" label="Pilot risks and controls" placeholder="Record access, support, escalation and operational safeguards." />
      <div className="md:col-span-2 xl:col-span-3"><Area name="dataProtectionBasis" label="Data-protection basis" placeholder="Record authorised data scope, roles, minimisation, retention and the relevant agreement or DPIA reference." /></div>
    </div>
    <button disabled={action.busy} className={primary}>{action.busy ? "Creating…" : "Create controlled pilot"}</button><Status action={action} />
  </form>;
}

const NEXT_STATUS: Record<string, string[]> = { PLANNED: ["ACTIVE", "WITHDRAWN"], ACTIVE: ["OUTCOME_REVIEW", "WITHDRAWN"], OUTCOME_REVIEW: ["ACTIVE", "COMPLETE", "WITHDRAWN"], COMPLETE: [], WITHDRAWN: [] };

export function PilotStatusForm({ id, status }: { id: string; status: string }) {
  const options = NEXT_STATUS[status] ?? [], action = useJsonAction(`/api/launch-readiness/pilots/${id}`, "PATCH"), [next, setNext] = useState(options[0] ?? "");
  if (!options.length) return null;
  return <form onSubmit={(event) => { event.preventDefault(); void action.run({ status: next }); }} className="flex flex-wrap items-end gap-3">
    <SelectValue label="Next controlled stage" value={next} onChange={setNext} options={options} />
    <button disabled={action.busy} className={next === "WITHDRAWN" ? danger : secondary}>{action.busy ? "Updating…" : "Update pilot stage"}</button><Status action={action} />
  </form>;
}

export function MeasureForm({ pilotId, existingTypes }: { pilotId: string; existingTypes: string[] }) {
  const action = useJsonAction(`/api/launch-readiness/pilots/${pilotId}/measures`), [type, setType] = useState<MeasureType>(MEASURE_TYPES.find((item) => !existingTypes.includes(item)) ?? MEASURE_TYPES[0]), definition = MEASURE_DEFINITIONS[type];
  return <details className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/60 p-4">
    <summary className="cursor-pointer font-black text-indigo-950">Record or correct an outcome measure</summary>
    <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run({ type, baselineValue: form.get("baselineValue"), outcomeValue: form.get("outcomeValue"), sampleSize: form.get("sampleSize"), measurementMethod: form.get("measurementMethod"), evidenceReference: form.get("evidenceReference") }); }} className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectValue label="Governed measure" value={type} onChange={(value) => setType(value as MeasureType)} options={MEASURE_TYPES} />
        <NumberInput name="baselineValue" label={`Baseline (${definition.unit})`} min={0} max={definition.unit === "%" ? 100 : 1_000_000} step="0.01" />
        <NumberInput name="outcomeValue" label={`Follow-up (${definition.unit}) — optional`} min={0} max={definition.unit === "%" ? 100 : 1_000_000} step="0.01" required={false} />
        <NumberInput name="sampleSize" label="Sample size" min={1} max={1_000_000} />
        <Text name="evidenceReference" label="Evidence reference" placeholder="EVID-2026-001" />
        <div className="md:col-span-2 xl:col-span-3"><Area name="measurementMethod" label="Measurement method" placeholder="Define numerator, denominator, source report and matched baseline/follow-up windows." /></div>
      </div>
      <p className="rounded-xl bg-white p-3 text-sm text-indigo-900"><strong>{definition.label}:</strong> {definition.description} Lower or higher performance is interpreted only from this declared definition.</p>
      <button disabled={action.busy} className={primary}>{action.busy ? "Saving…" : "Save measured result"}</button><Status action={action} />
    </form>
  </details>;
}

export function MeasureVerificationForm({ id }: { id: string }) {
  const action = useJsonAction(`/api/launch-readiness/measures/${id}/verify`, "PATCH"), [decision, setDecision] = useState("VERIFIED");
  return <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run({ decision, verificationNote: form.get("verificationNote") }); }} className="mt-3 grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 md:grid-cols-[170px_1fr_auto] md:items-end">
    <SelectValue label="Independent decision" value={decision} onChange={setDecision} options={["VERIFIED", "REJECTED"]} />
    <Text name="verificationNote" label="Verification rationale" placeholder="Describe the source, calculation and sample checked." />
    <button disabled={action.busy} className={decision === "VERIFIED" ? primary : danger}>{action.busy ? "Recording…" : "Record review"}</button><div className="md:col-span-3"><Status action={action} /></div>
  </form>;
}

export function StartServiceReadinessButton() {
  const action = useJsonAction("/api/launch-readiness/service-readiness");
  return <div><button disabled={action.busy} onClick={() => void action.run({})} className={primary}>{action.busy ? "Starting…" : "Start service-readiness register"}</button><Status action={action} /></div>;
}

export function ServiceReadinessForm({ id, status, evidenceNote, evidenceId, evidenceOptions }: { id: string; status: string; evidenceNote: string | null; evidenceId: string | null; evidenceOptions: Array<{ id: string; title: string }> }) {
  const action = useJsonAction(`/api/launch-readiness/service-readiness/${id}`, "PATCH"), [next, setNext] = useState(status), [note, setNote] = useState(evidenceNote ?? ""), [selectedEvidence, setSelectedEvidence] = useState(evidenceId ?? "");
  return <form onSubmit={(event) => { event.preventDefault(); void action.run({ status: next, evidenceNote: note, evidenceId: next === "EVIDENCED" ? selectedEvidence : null }); }} className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
    <SelectValue label="Evidence status" value={next} onChange={setNext} options={["NOT_STARTED", "IN_PROGRESS", "EVIDENCED", "BLOCKED"]} />
    <label className={labelClass}>Evidence or blocker note<input value={note} onChange={(event) => setNote(event.target.value)} className={field} maxLength={2000} placeholder="Name the current document, test, owner and review date." /></label>
    {next === "EVIDENCED" ? <label className={`${labelClass} md:col-span-2`}>Current independently verified evidence<select value={selectedEvidence} onChange={(event) => setSelectedEvidence(event.target.value)} required className={field}><option value="">Select evidence…</option>{evidenceOptions.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label> : null}
    <button disabled={action.busy} className={secondary}>{action.busy ? "Saving…" : "Save evidence"}</button><div className="md:col-span-3"><Status action={action} /></div>
  </form>;
}

export function CommercialIntentForm({ pilotId, initial }: { pilotId: string; initial?: { status: string; buyerRole: string; proposedPlan: string; licenceEstimate: number; targetDecisionDate: string; evidenceNote: string } }) {
  const action = useJsonAction("/api/launch-readiness/commercial-intent", "PUT"), [status, setStatus] = useState(initial?.status ?? "DISCOVERY");
  return <details className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4">
    <summary className="cursor-pointer font-black text-emerald-950">Record external commercial intent</summary>
    <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run({ pilotId, status, buyerRole: form.get("buyerRole"), proposedPlan: form.get("proposedPlan"), licenceEstimate: form.get("licenceEstimate"), targetDecisionDate: form.get("targetDecisionDate"), evidenceNote: form.get("evidenceNote") }); }} className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectValue label="Intent stage" value={status} onChange={setStatus} options={["DISCOVERY", "PILOT_ONLY", "BUDGET_CONFIRMED", "CONTRACT_REVIEW", "READY_TO_BUY", "DECLINED"]} />
        <Text name="buyerRole" label="Authorised buyer role" defaultValue={initial?.buyerRole} placeholder="Owner / Responsible Individual" />
        <Text name="proposedPlan" label="Proposed service plan" defaultValue={initial?.proposedPlan} placeholder="Multi-location governance plan" />
        <NumberInput name="licenceEstimate" label="Estimated licensed users" min={1} max={100_000} defaultValue={initial?.licenceEstimate} />
        <DateInput name="targetDecisionDate" label="Target decision date — optional" required={false} defaultValue={initial?.targetDecisionDate} />
        <div className="md:col-span-2 xl:col-span-3"><Area name="evidenceNote" label="Evidence of stated intent" defaultValue={initial?.evidenceNote} placeholder="Record the dated conversation, budget or contract-review evidence. Do not treat interest as revenue." /></div>
      </div>
      <button disabled={action.busy} className={primary}>{action.busy ? "Saving…" : "Save commercial evidence"}</button><Status action={action} />
    </form>
  </details>;
}

export function BenchmarkRequestForm() {
  const action = useJsonAction("/api/launch-readiness/benchmark-consent"), [selected, setSelected] = useState<string[]>(["ACTION_CLOSURE_DAYS"]);
  return <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run({ permittedMetricKeys: selected, minimumCohortSize: form.get("minimumCohortSize"), dpiaReference: form.get("dpiaReference") }); }} className="space-y-4">
    <fieldset><legend className="text-sm font-black">Permitted aggregate metrics</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{MEASURE_TYPES.map((type) => <label key={type} className="flex items-center gap-2 rounded-xl border bg-white p-3 text-sm font-bold"><input type="checkbox" checked={selected.includes(type)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, type] : current.filter((item) => item !== type))} />{MEASURE_DEFINITIONS[type].label}</label>)}</div></fieldset>
    <div className="grid gap-4 md:grid-cols-2"><NumberInput name="minimumCohortSize" label="Minimum anonymous cohort" min={10} max={1000} defaultValue={10} /><Text name="dpiaReference" label="DPIA / privacy review reference" placeholder="DPIA-2026-04 approved 20 August 2026" /></div>
    <button disabled={action.busy || !selected.length} className={primary}>{action.busy ? "Requesting…" : "Request independent consent review"}</button><Status action={action} />
  </form>;
}

export function BenchmarkReviewForm() {
  const action = useJsonAction("/api/launch-readiness/benchmark-consent/review", "PATCH"), [decision, setDecision] = useState("APPROVED");
  return <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run({ decision, reviewNote: form.get("reviewNote") }); }} className="mt-4 grid gap-3 md:grid-cols-[170px_1fr_auto] md:items-end">
    <SelectValue label="Independent decision" value={decision} onChange={setDecision} options={["APPROVED", "DECLINED"]} />
    <Text name="reviewNote" label="Privacy review rationale" placeholder="Confirm DPIA, lawful basis, minimisation and withdrawal route." />
    <button disabled={action.busy} className={decision === "APPROVED" ? primary : danger}>{action.busy ? "Recording…" : "Record privacy decision"}</button><div className="md:col-span-3"><Status action={action} /></div>
  </form>;
}

export function BenchmarkWithdrawForm() {
  const action = useJsonAction("/api/launch-readiness/benchmark-consent", "PATCH");
  return <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run({ reason: form.get("reason") }); }} className="mt-4 flex flex-wrap items-end gap-3"><Text name="reason" label="Withdrawal reason" placeholder="Record why future aggregate processing is withdrawn." /><button disabled={action.busy} className={danger}>{action.busy ? "Withdrawing…" : "Withdraw participation"}</button><Status action={action} /></form>;
}

function Text({ name, label, placeholder, defaultValue }: { name: string; label: string; placeholder?: string; defaultValue?: string }) { return <label className={labelClass}>{label}<input name={name} required minLength={3} maxLength={2000} defaultValue={defaultValue} placeholder={placeholder} className={field} /></label>; }
function Area({ name, label, placeholder, defaultValue }: { name: string; label: string; placeholder?: string; defaultValue?: string }) { return <label className={labelClass}>{label}<textarea name={name} required minLength={12} maxLength={2000} rows={3} defaultValue={defaultValue} placeholder={placeholder} className={field} /></label>; }
function DateInput({ name, label, required = true, defaultValue }: { name: string; label: string; required?: boolean; defaultValue?: string }) { return <label className={labelClass}>{label}<input type="date" name={name} required={required} defaultValue={defaultValue} className={field} /></label>; }
function NumberInput({ name, label, min, max, step = "1", required = true, defaultValue }: { name: string; label: string; min: number; max: number; step?: string; required?: boolean; defaultValue?: number }) { return <label className={labelClass}>{label}<input type="number" name={name} min={min} max={max} step={step} required={required} defaultValue={defaultValue} className={field} /></label>; }
function Select({ name, label, options }: { name: string; label: string; options: readonly string[] }) { return <label className={labelClass}>{label}<select name={name} className={field}>{options.map((option) => <option key={option} value={option}>{labelValue(option)}</option>)}</select></label>; }
function SelectValue({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) { return <label className={labelClass}>{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={field}>{options.map((option) => <option key={option} value={option}>{labelValue(option)}</option>)}</select></label>; }
function Status({ action }: { action: Pick<MessageState, "message" | "error"> }) { return action.message ? <p role="status" className={`text-sm font-semibold ${action.error ? "text-red-700" : "text-emerald-700"}`}>{action.message}</p> : null; }
function labelValue(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()); }

const labelClass = "block min-w-0 text-sm font-bold text-slate-800";
const field = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const primary = "rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50";
const danger = "rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50";
