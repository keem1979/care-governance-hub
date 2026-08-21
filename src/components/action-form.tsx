"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACTION_CATEGORIES, ACTION_PRIORITIES, ACTION_STATUSES, actionLabel } from "@/lib/actions";
import { MEDICATION_ISSUE_TYPES } from "@/lib/closure-loop";
import { FormPurpose } from "@/components/form-purpose";

type Option = { id: string; name: string };
type Source = { type: string; id: string; label: string };
type Match = { actionId: string; reference: string; title: string; score: number; kind: string; rationale: string[]; lifecycleStatus: string };
type Values = Record<string, string | number | boolean | null | string[] | undefined>;
type Initial = Values & { id: string; evidenceIds: string[] };

export function ActionForm({ locations, owners, oversightOwners, clients, evidence, sources, initial, preselectedSource, prefill, riskHandoff }: { locations: Option[]; owners: Option[]; oversightOwners: Option[]; clients: Option[]; evidence: Option[]; sources: Source[]; initial?: Initial; preselectedSource?: string; prefill?: Values; riskHandoff?: { reference: string; residualScore: number; targetScore: number } }) {
  const router = useRouter(), [error, setError] = useState(""), [busy, setBusy] = useState(false), [matches, setMatches] = useState<Match[]>([]), [pending, setPending] = useState<FormData | null>(null);
  const cls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
  const value = (key: string) => (initial?.[key] ?? prefill?.[key]) as string | undefined;

  async function save(payload: FormData) {
    setBusy(true); setError("");
    const response = await fetch(initial ? `/api/actions/${initial.id}` : "/api/actions", { method: initial ? "PATCH" : "POST", body: payload });
    const result = await response.json().catch(() => ({}));
    if (response.status === 409 && result.code === "POSSIBLE_MATCH") { setMatches(result.matches ?? []); setPending(payload); setError(result.error); setBusy(false); return; }
    if (!response.ok) { setError(result.error ?? "Could not save action."); setBusy(false); return; }
    router.push(`/actions/${initial?.id ?? result.id}`); router.refresh();
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setMatches([]); setPending(null); await save(new FormData(event.currentTarget)); }
  async function decide(decision: string) { if (!pending) return; const payload = new FormData(); pending.forEach((item, key) => payload.append(key, item)); payload.set("matchDecision", decision); setMatches([]); await save(payload); }

  return <form onSubmit={submit} className="space-y-7">
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-950 to-emerald-800 p-6 text-white"><FormPurpose title="Improvement action" description="Turn a finding into a measurable result, with one accountable owner, occurrence history, evidence and independent closure." steps={["Define the outcome", "Check for an existing action", "Track response and evidence", "Verify and monitor"]} /></div>
    {riskHandoff?<section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950"><p className="text-xs font-black uppercase tracking-widest">Risk treatment handoff · {riskHandoff.reference}</p><h2 className="mt-1 text-lg font-bold">Review before creating the central Action</h2><p className="mt-1 text-sm leading-6">QCGMS has proposed wording, scope, ownership, due date and assurance from the Risk. Amend anything that is not appropriate. Completing this Action will not change the Risk automatically: current residual {riskHandoff.residualScore}; expected target {riskHandoff.targetScore}. Effectiveness and any score change require a formal Risk review.</p></section>:null}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</p>}
    {matches.length > 0 && <section className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6"><h2 className="text-lg font-black text-amber-950">Review possible existing action</h2><p className="mt-1 text-sm text-amber-900">Matching is advisory. A manager must confirm a link or reject it before creating a separate action.</p><div className="mt-4 space-y-3">{matches.map((match) => <div key={match.actionId} className="rounded-xl border border-amber-200 bg-white p-4"><p className="font-bold">{match.reference} — {match.title}</p><p className="text-sm text-slate-600">{actionLabel(match.kind)} · {match.score}% confidence · {actionLabel(match.lifecycleStatus)}</p><p className="mt-1 text-xs text-slate-500">{match.rationale.join(" · ")}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => decide(`LINK:${match.actionId}`)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white">Link occurrence</button><button type="button" onClick={() => decide(`REJECT:${match.actionId}`)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold">Reject match</button></div></div>)}</div></section>}

    <Section number="1" title="Outcome and success" copy="Make the required improvement and its benefit measurable."><div className="grid gap-4 md:grid-cols-2">
      <Field label="Action reference" hint="created automatically if blank"><input className={cls} name="reference" defaultValue={value("reference")} readOnly={Boolean(initial)} /></Field>
      <Field label="Operational responsibility area"><select className={cls} name="category" defaultValue={value("category") ?? ACTION_CATEGORIES[0]}>{ACTION_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="What must be achieved?" wide><input className={cls} name="title" required minLength={3} defaultValue={value("title")} /></Field>
      <Field label="Work required" wide><textarea className={`${cls} min-h-24`} name="description" required defaultValue={value("description")} /></Field>
      <Field label="Root cause or contributing factors" wide><textarea className={`${cls} min-h-20`} name="rootCause" defaultValue={value("rootCause")} /></Field>
      <Field label="Expected outcome" wide><textarea className={`${cls} min-h-20`} name="expectedOutcome" required defaultValue={value("expectedOutcome")} /></Field>
      <Field label="How will success be measured?" wide><textarea className={`${cls} min-h-20`} name="successMeasure" required defaultValue={value("successMeasure")} /></Field>
      <Field label="Issue key" hint="used to recognise repeats"><input className={cls} name="issueKey" defaultValue={value("issueKey")} placeholder="medicine-name-or-control-gap" /></Field>
      <Field label="Medication exception"><select className={cls} name="medicationIssueType" defaultValue={value("medicationIssueType") ?? ""}><option value="">Not medication-specific</option>{MEDICATION_ISSUE_TYPES.map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select></Field>
    </div></Section>

    <Section number="2" title="Source, ownership and milestones" copy="Connect the source so every repeat remains traceable on one canonical record."><div className="grid gap-4 md:grid-cols-2">
      <Field label="Source record" wide><select className={cls} name="source" defaultValue={initial ? `${value("sourceType")}:${value("sourceRecordId") ?? ""}` : preselectedSource ?? "MANUAL:"}><option value="MANUAL:">Manual improvement action</option>{sources.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{actionLabel(item.type)} · {item.label}</option>)}</select></Field>
      <Field label="Delivery owner" hint="person completing or coordinating the work"><select className={cls} name="ownerId" required defaultValue={value("ownerId") ?? ""}><option value="">Choose delivery owner</option>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Registered Manager / senior oversight" hint="retains oversight while work may be delegated"><select className={cls} name="oversightOwnerId" required defaultValue={value("oversightOwnerId") ?? ""}><option value="">Choose oversight lead</option>{oversightOwners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Person affected" hint="optional for service-wide or workforce actions"><select className={cls} name="clientId" defaultValue={value("clientId") ?? ""}><option value="">No specific client</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Service or branch"><select className={cls} name="locationId" defaultValue={value("locationId") ?? ""}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Priority"><select className={cls} name="priority" defaultValue={value("priority") ?? "MEDIUM"}>{ACTION_PRIORITIES.map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select></Field>
      <Field label="Due date"><input className={cls} type="date" name="dueDate" required defaultValue={value("dueDate") ?? future(30)} /></Field>
      <Field label="Checkpoint / review date"><input className={cls} type="date" name="reviewDate" defaultValue={value("reviewDate") ?? future(14)} /></Field>
    </div><div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><strong>Accountability and delegation:</strong> choose the person who will deliver the work and the manager who will oversee progress, escalation and assurance. Linking the Registered Manager does not mean they personally complete every task, and it does not transfer the registered provider’s duties.</div></Section>

    <Section number="3" title="Management response and progress" copy="A response records what management says has happened; it does not close the finding."><div className="grid gap-4 md:grid-cols-2">
      <Field label="Status"><select className={cls} name="status" defaultValue={value("status") ?? "OPEN"}>{ACTION_STATUSES.filter((item) => !["OVERDUE", "ARCHIVED"].includes(item)).map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select></Field>
      <Field label="Progress completed (%)"><input className={cls} type="number" min="0" max="100" step="5" name="progressPercent" defaultValue={(initial?.progressPercent as number | undefined) ?? (prefill?.progressPercent as number | undefined) ?? 0} /></Field>
      <Field label="Management response" wide><textarea className={`${cls} min-h-24`} name="managementResponse" defaultValue={value("managementResponse")} placeholder="Record the response received, who provided it and the stated completion position." /></Field>
      <Field label="Current progress summary" wide><textarea className={`${cls} min-h-20`} name="progressNote" defaultValue={value("progressNote")} /></Field>
      <Field label="Does this need escalation?"><select className={cls} name="escalationRequired" defaultValue={String(initial?.escalationRequired ?? false)}><option value="false">No</option><option value="true">Yes — management attention required</option></select></Field>
      <Field label="Reason for escalation"><textarea className={`${cls} min-h-20`} name="escalationReason" defaultValue={value("escalationReason")} /></Field>
    </div></Section>

    <Section number="4" title="Evidence, verification and recurrence" copy="Closed and verified requires evidence, a completed checklist, named verification and a clear rationale."><div className="grid gap-4 md:grid-cols-2">
      <Field label="Completion date"><input className={cls} type="date" name="completionDate" defaultValue={value("completionDate")} /></Field>
      <Field label="Evidence attached" wide><p className="mt-1 text-xs font-normal text-slate-500">Hold Ctrl or Command to choose more than one item.</p><select multiple className={`${cls} min-h-32`} name="evidenceIds" defaultValue={initial?.evidenceIds ?? []}>{evidence.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Action completed summary" wide><textarea className={`${cls} min-h-20`} name="completedActionSummary" defaultValue={value("completedActionSummary")} /></Field>
      <Field label="Evidence reviewed summary" wide><textarea className={`${cls} min-h-20`} name="evidenceReviewedSummary" defaultValue={value("evidenceReviewedSummary")} /></Field>
      {[["immediateRiskControlled", "Immediate risk controlled"], ["underlyingRecordCorrected", "Underlying record corrected"], ["staffSupportCompleted", "Staff support or competency completed"], ["widerRecordsChecked", "Wider records checked"], ["recurrenceChecked", "Recurrence check completed"]].map(([name, label]) => <Field key={name} label={label}><YesNo className={cls} name={name} initial={initial?.[name] as boolean | null | undefined} /></Field>)}
      <Field label="Verified by"><select className={cls} name="verifiedById" defaultValue={value("verifiedById") ?? ""}><option value="">Not verified</option>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Verification date"><input className={cls} type="date" name="verificationDate" defaultValue={value("verificationDate")} /></Field>
      <Field label="Verification and closure rationale" wide><textarea className={`${cls} min-h-24`} name="verificationRationale" defaultValue={value("verificationRationale")} /></Field>
      <Field label="Closure outcome" wide><textarea className={`${cls} min-h-20`} name="closureNote" defaultValue={value("closureNote")} /></Field>
      <Field label="Monitor recurrence until"><input className={cls} type="date" name="monitoringUntil" defaultValue={value("monitoringUntil")} /></Field>
      <Field label="Next recurrence review"><input className={cls} type="date" name="nextRecurrenceReviewDate" defaultValue={value("nextRecurrenceReviewDate")} /></Field>
    </div></Section>
    <div className="sticky bottom-4 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur"><button disabled={busy} className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving action…" : initial ? "Save action" : "Check and create action"}</button></div>
  </form>;
}

function Section({ number, title, copy, children }: { number: string; title: string; copy: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800">{number}</span><div><h2 className="text-lg font-bold">{title}</h2><p className="text-sm text-slate-600">{copy}</p></div></div><div className="mt-5">{children}</div></section>; }
function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) { return <label className={`${wide ? "md:col-span-2 " : ""}text-sm font-semibold text-slate-800`}>{label}{hint && <span className="font-normal text-slate-500"> ({hint})</span>}{children}</label>; }
function YesNo({ className, name, initial }: { className: string; name: string; initial?: boolean | null }) { return <select className={className} name={name} defaultValue={initial === true ? "true" : initial === false ? "false" : ""}><option value="">Not checked</option><option value="true">Yes</option><option value="false">No / not applicable — explain in rationale</option></select>; }
function future(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
