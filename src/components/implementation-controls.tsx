"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConfigurationSettings, NotificationCadenceKey, NotificationCategoryKey } from "@/lib/configurable-delivery";

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

export function StartImplementationForm() {
  const action = useJsonAction("/api/implementation/onboarding"), [targetLiveDate, setTargetLiveDate] = useState("");
  return <form onSubmit={(event) => { event.preventDefault(); void action.run({ targetLiveDate }); }} className="space-y-3">
    <label className="block text-sm font-bold">Target go-live date<input type="date" required value={targetLiveDate} onChange={(event) => setTargetLiveDate(event.target.value)} className={field} /></label>
    <button disabled={action.busy} className={primary}>{action.busy ? "Starting…" : "Start controlled onboarding"}</button><Status action={action} />
  </form>;
}

export function ConfigurationVersionForm({ defaults }: { defaults: ConfigurationSettings }) {
  const action = useJsonAction("/api/implementation/configurations"), [values, setValues] = useState(defaults);
  function value<K extends keyof ConfigurationSettings>(key: K, next: ConfigurationSettings[K]) { setValues((current) => ({ ...current, [key]: next })); }
  return <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run({ defaultJurisdiction: values.defaultJurisdiction, actionEscalationDays: values.actionEscalationDays, reviewLeadDays: values.reviewLeadDays, evidenceExpiryLeadDays: values.evidenceExpiryLeadDays, defaultDigestCadence: values.defaultDigestCadence, changeSummary: form.get("changeSummary") }); }} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Select label="Default UK jurisdiction" value={values.defaultJurisdiction} onChange={(next) => value("defaultJurisdiction", next as ConfigurationSettings["defaultJurisdiction"])} options={["ENGLAND", "SCOTLAND", "WALES", "NORTHERN_IRELAND"]} />
      <NumberField label="Action escalation after days" value={values.actionEscalationDays} min={1} max={14} onChange={(next) => value("actionEscalationDays", next)} />
      <NumberField label="Review reminder lead days" value={values.reviewLeadDays} min={7} max={90} onChange={(next) => value("reviewLeadDays", next)} />
      <NumberField label="Evidence expiry lead days" value={values.evidenceExpiryLeadDays} min={7} max={90} onChange={(next) => value("evidenceExpiryLeadDays", next)} />
      <Select label="Default non-urgent digest" value={values.defaultDigestCadence} onChange={(next) => value("defaultDigestCadence", next as "DAILY" | "WEEKLY")} options={["DAILY", "WEEKLY"]} />
      <label className="block text-sm font-bold sm:col-span-2 xl:col-span-3">Change summary<textarea name="changeSummary" required minLength={12} maxLength={500} rows={3} className={field} placeholder="Explain why this configuration is needed and what the sandbox test must prove." /></label>
    </div>
    <button disabled={action.busy} className={primary}>{action.busy ? "Creating…" : "Create sandbox version"}</button><Status action={action} />
  </form>;
}

export function SubmitPromotionButton({ id, disabled }: { id: string; disabled: boolean }) {
  const action = useJsonAction(`/api/implementation/configurations/${id}/submit`);
  return <div><button disabled={action.busy || disabled} onClick={() => void action.run({})} className={primary}>{action.busy ? "Submitting…" : "Request independent live promotion"}</button>{disabled ? <p className="mt-2 text-xs text-amber-800">Complete all required onboarding evidence before requesting promotion.</p> : null}<Status action={action} /></div>;
}

export function WithdrawVersionButton({ id }: { id: string }) {
  const action = useJsonAction(`/api/implementation/configurations/${id}/discard`);
  return <div><button disabled={action.busy} onClick={() => void action.run({})} className={danger}>{action.busy ? "Withdrawing…" : "Withdraw sandbox version"}</button><Status action={action} /></div>;
}

export function PromotionReviewForm({ id }: { id: string }) {
  const action = useJsonAction(`/api/implementation/promotions/${id}`, "PATCH"), [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED"), [reviewComment, setReviewComment] = useState("");
  return <form onSubmit={(event) => { event.preventDefault(); void action.run({ decision, reviewComment }); }} className="mt-4 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
    <Select label="Independent decision" value={decision} onChange={(next) => setDecision(next as "APPROVED" | "REJECTED")} options={["APPROVED", "REJECTED"]} />
    <label className="block text-sm font-bold">Review rationale<textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} required minLength={12} maxLength={1500} rows={3} className={field} /></label>
    <button disabled={action.busy} className={decision === "APPROVED" ? primary : danger}>{action.busy ? "Recording…" : decision === "APPROVED" ? "Approve live promotion" : "Reject version"}</button><Status action={action} />
  </form>;
}

export function ChecklistItemForm({ id, status, evidenceNote }: { id: string; status: string; evidenceNote: string | null }) {
  const action = useJsonAction(`/api/implementation/onboarding/items/${id}`, "PATCH"), [nextStatus, setNextStatus] = useState(status), [note, setNote] = useState(evidenceNote ?? "");
  return <form onSubmit={(event) => { event.preventDefault(); void action.run({ status: nextStatus, evidenceNote: note }); }} className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
    <Select label="Status" value={nextStatus} onChange={setNextStatus} options={["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "BLOCKED"]} />
    <label className="block text-sm font-bold">Evidence or blocker note<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} className={field} placeholder="Name the check, record or decision reviewed." /></label>
    <button disabled={action.busy} className={secondary}>{action.busy ? "Saving…" : "Save evidence"}</button><div className="sm:col-span-3"><Status action={action} /></div>
  </form>;
}

export function NotificationPreferenceForm({ category, enabled, cadence, locked }: { category: NotificationCategoryKey; enabled: boolean; cadence: NotificationCadenceKey; locked: boolean }) {
  const action = useJsonAction("/api/implementation/notifications", "PUT"), [isEnabled, setEnabled] = useState(enabled), [nextCadence, setCadence] = useState(cadence);
  return <form onSubmit={(event) => { event.preventDefault(); void action.run({ category, enabled: locked ? true : isEnabled, cadence: locked ? "IMMEDIATE" : nextCadence }); }} className="mt-3 grid gap-3 sm:grid-cols-[150px_160px_auto] sm:items-end">
    <Select label="In-app feed" value={locked || isEnabled ? "ENABLED" : "DISABLED"} onChange={(next) => setEnabled(next === "ENABLED")} options={locked ? ["ENABLED"] : ["ENABLED", "DISABLED"]} disabled={locked} />
    <Select label="Cadence" value={locked ? "IMMEDIATE" : nextCadence} onChange={(next) => setCadence(next as NotificationCadenceKey)} options={locked ? ["IMMEDIATE"] : ["IMMEDIATE", "DAILY", "WEEKLY"]} disabled={locked} />
    <button disabled={action.busy || locked} className={secondary}>{locked ? "Protected" : action.busy ? "Saving…" : "Save preference"}</button><div className="sm:col-span-3"><Status action={action} /></div>
  </form>;
}

function Select({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; disabled?: boolean }) { return <label className="block text-sm font-bold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={field}>{options.map((option) => <option key={option} value={option}>{labelValue(option)}</option>)}</select></label>; }
function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) { return <label className="block text-sm font-bold">{label}<input type="number" value={value} min={min} max={max} required onChange={(event) => onChange(Number(event.target.value))} className={field} /></label>; }
function Status({ action }: { action: Pick<MessageState, "message" | "error"> }) { return action.message ? <p role="status" className={`mt-2 text-sm font-semibold ${action.error ? "text-red-700" : "text-emerald-700"}`}>{action.message}</p> : null; }
function labelValue(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()); }

const field = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100";
const primary = "rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50";
const danger = "rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50";
