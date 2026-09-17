"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthorisedAsyncCombobox, AuthorisedAsyncMultiSelect } from "@/components/authorised-async-selector";
import { FormPurpose } from "@/components/form-purpose";
import { ACTION_CATEGORIES, ACTION_PRIORITIES, ACTION_STATUSES, actionLabel } from "@/lib/actions";
import { MEDICATION_ISSUE_TYPES } from "@/lib/closure-loop";

type Option = { id: string; name: string };
type Source = { type: string; id: string; label: string };
type Match = { actionId: string; reference: string; title: string; score: number; kind: string; rationale: string[]; lifecycleStatus: string };
type Values = Record<string, string | number | boolean | null | string[] | undefined>;
type Initial = Values & { id: string; evidenceIds: string[] };

export function ActionForm({ locations, owners, oversightOwners, clients, evidence, sources, initial, preselectedSource, prefill, riskHandoff, incidentHandoff, complaintHandoff }: { locations: Option[]; owners: Option[]; oversightOwners: Option[]; clients: Option[]; evidence: Option[]; sources: Source[]; initial?: Initial; preselectedSource?: string; prefill?: Values; riskHandoff?: { reference: string; residualScore: number; targetScore: number }; incidentHandoff?: { reference: string; riskLevel: string }; complaintHandoff?: { reference: string; riskLevel: string } }) {
  const router = useRouter();
  const value = (key: string) => (initial?.[key] ?? prefill?.[key]) as string | undefined;
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [matches, setMatches] = useState<Match[]>([]), [pending, setPending] = useState<FormData | null>(null);
  const [locationId, setLocationId] = useState(value("locationId") ?? "");
  const cls = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

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

  return <form onSubmit={submit} className="space-y-5">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><FormPurpose title="Create one accountable Action" description="QCGMS keeps the source, scope and governance history connected. Add the decision only the manager can make." steps={["Define the work", "Assign ownership", "Confirm the outcome", "Track evidence and assurance"]} /></div>
    {riskHandoff ? <Handoff tone="blue" eyebrow={`Risk treatment · ${riskHandoff.reference}`} title="Source context carried forward">Review the proposed wording, owner, scope and deadline. Completing this Action will not change the Risk automatically: current residual {riskHandoff.residualScore}; target {riskHandoff.targetScore}. A formal Risk review remains required.</Handoff> : null}
    {incidentHandoff ? <Handoff tone="violet" eyebrow={`Incident · ${incidentHandoff.reference} · ${incidentHandoff.riskLevel}`} title="Improvement linked to the Incident">QCGMS has carried forward the source context. Action completion will not close the Incident; it retains its own investigation and assurance decision.</Handoff> : null}
    {complaintHandoff ? <Handoff tone="fuchsia" eyebrow={`Complaint · ${complaintHandoff.reference} · ${complaintHandoff.riskLevel}`} title="Improvement linked to the Complaint">This creates one central Action linked to the Complaint, with source context carried forward. Action completion will not close the Complaint; it retains its own response and assurance decision.</Handoff> : null}
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</p> : null}
    {matches.length ? <section className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5"><h2 className="text-lg font-black text-amber-950">A related Action may already exist</h2><p className="mt-1 text-sm text-amber-900">Review the match before creating another lifecycle.</p><div className="mt-4 space-y-3">{matches.map((match) => <div key={match.actionId} className="rounded-xl border border-amber-200 bg-white p-4"><p className="font-bold">{match.reference} — {match.title}</p><p className="text-sm text-slate-600">{actionLabel(match.kind)} · {match.score}% match · {actionLabel(match.lifecycleStatus)}</p><p className="mt-1 text-xs text-slate-500">{match.rationale.join(" · ")}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => decide(`LINK:${match.actionId}`)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white">Link to this Action</button><button type="button" onClick={() => decide(`REJECT:${match.actionId}`)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold">Create separate Action</button></div></div>)}</div></section> : null}

    <Section number="1" title="What needs to be done?" copy="Keep the instruction short and specific; source details are already linked.">
      <div className="grid gap-4 md:grid-cols-2">
        {initial ? <Field label="Action reference"><input className={cls} name="reference" defaultValue={value("reference")} readOnly /></Field> : <input type="hidden" name="reference" value="" />}
        <Field label="What must be achieved?" wide={!initial}><input className={cls} name="title" required minLength={3} defaultValue={value("title")} placeholder="For example: Complete medication competency reassessment" /></Field>
        <Field label="Brief instructions" wide><textarea className={`${cls} min-h-24`} name="description" required minLength={3} defaultValue={value("description")} placeholder="What specifically must the owner do?" /></Field>
        <AuthorisedAsyncCombobox name="ownerId" label="Who owns this Action?" kind="OWNER" initialOptions={owners} defaultValue={value("ownerId") ?? ""} locationId={locationId} placeholder="Search authorised users" required />
        <Field label="When is it due?"><input className={cls} type="date" name="dueDate" required defaultValue={value("dueDate") ?? ""} /></Field>
        <AuthorisedAsyncCombobox name="oversightOwnerId" label="RM / senior oversight" kind="OVERSIGHT" initialOptions={oversightOwners} defaultValue={value("oversightOwnerId") ?? ""} locationId={locationId} placeholder="Search authorised oversight leads" required />
        <Field label="Priority"><select className={cls} name="priority" defaultValue={value("priority") ?? "MEDIUM"}>{ACTION_PRIORITIES.map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select></Field>
      </div>
    </Section>

    <Section number="2" title="What outcome should this achieve?" copy="Define the result and the shortest useful test of whether it worked.">
      <div className="grid gap-4 md:grid-cols-2"><Field label="Expected outcome" wide><textarea className={`${cls} min-h-20`} name="expectedOutcome" required defaultValue={value("expectedOutcome")} placeholder="What should be different when the work is complete?" /></Field><Field label="How will we know it worked?" wide><textarea className={`${cls} min-h-20`} name="successMeasure" required defaultValue={value("successMeasure")} placeholder="For example: competency observed and no repeat error during the next audit sample." /></Field></div>
    </Section>

    <Section number="3" title="Confirm known context" copy="Select existing records; do not recreate information QCGMS already holds.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Source record" wide><select className={cls} name="source" defaultValue={initial ? `${value("sourceType")}:${value("sourceRecordId") ?? ""}` : preselectedSource ?? "MANUAL:"}><option value="MANUAL:">Manual improvement Action</option>{sources.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{actionLabel(item.type)} · {item.label}</option>)}</select></Field>
        <Field label="Service or branch"><select className={cls} name="locationId" value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <AuthorisedAsyncCombobox name="clientId" label="Person affected (optional)" kind="CLIENT" initialOptions={clients} defaultValue={value("clientId") ?? ""} locationId={locationId} placeholder="Search the authorised Client directory" emptyLabel="No authorised Client matches this search" />
        <Field label="Responsibility area"><select className={cls} name="category" defaultValue={value("category") ?? ACTION_CATEGORIES[0]}>{ACTION_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
      </div>
    </Section>

    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="cursor-pointer px-5 py-4 font-black text-slate-900">Link existing source Evidence <span className="ml-2 text-sm font-normal text-slate-500">Optional now; completion Evidence is added during progress</span></summary><div className="border-t border-slate-200 p-5"><AuthorisedAsyncMultiSelect name="evidenceIds" label="Find existing Evidence" kind="EVIDENCE" initialOptions={evidence} defaultValues={initial?.evidenceIds ?? []} locationId={locationId} placeholder="Search by title, source or reference" /><p className="mt-2 text-xs text-slate-500">Linking source Evidence shows where the Action came from; it does not prove that the Action was completed or effective.</p></div></details>

    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="cursor-pointer px-5 py-4 font-black text-slate-900">Additional governance details <span className="ml-2 text-sm font-normal text-slate-500">Complete only when relevant</span></summary><div className="grid gap-4 border-t border-slate-200 p-5 md:grid-cols-2">
      <Field label="Root cause or contributing factors" wide><textarea className={`${cls} min-h-20`} name="rootCause" defaultValue={value("rootCause")} /></Field>
      <Field label="Issue key" hint="used to recognise repeats"><input className={cls} name="issueKey" defaultValue={value("issueKey")} /></Field>
      <Field label="Medication exception"><select className={cls} name="medicationIssueType" defaultValue={value("medicationIssueType") ?? ""}><option value="">Not medication-specific</option>{MEDICATION_ISSUE_TYPES.map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select></Field>
      <Field label="Checkpoint / review date"><input className={cls} type="date" name="reviewDate" defaultValue={value("reviewDate") ?? ""} /></Field>
      <Field label="Monitor recurrence until"><input className={cls} type="date" name="monitoringUntil" defaultValue={value("monitoringUntil")} /></Field>
      <Field label="Next recurrence review"><input className={cls} type="date" name="nextRecurrenceReviewDate" defaultValue={value("nextRecurrenceReviewDate")} /></Field>
      <Field label="Does this need escalation?"><select className={cls} name="escalationRequired" defaultValue={String(initial?.escalationRequired ?? prefill?.escalationRequired ?? false)}><option value="false">No</option><option value="true">Yes — management attention required</option></select></Field>
      <Field label="Reason for escalation"><textarea className={`${cls} min-h-20`} name="escalationReason" defaultValue={value("escalationReason")} /></Field>
      {initial ? <><Field label="Current status"><select className={cls} name="status" defaultValue={value("status") ?? "OPEN"}>{ACTION_STATUSES.filter((item) => !["OVERDUE", "ARCHIVED", "COMPLETED"].includes(item)).map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select></Field><Field label="Progress completed (%)"><input className={cls} type="number" min="0" max="100" step="5" name="progressPercent" defaultValue={(initial.progressPercent as number | undefined) ?? 0} /></Field><Field label="Management response" wide><textarea className={`${cls} min-h-20`} name="managementResponse" defaultValue={value("managementResponse")} /></Field><Field label="Current progress summary" wide><textarea className={`${cls} min-h-20`} name="progressNote" defaultValue={value("progressNote")} /></Field></> : <><input type="hidden" name="status" value="OPEN" /><input type="hidden" name="progressPercent" value="0" /></>}
    </div></details>

    <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur"><p className="hidden text-sm text-slate-600 sm:block">QCGMS will add the reference, creator and timestamp.</p><button disabled={busy} className="min-h-11 rounded-xl bg-emerald-800 px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving Action…" : initial ? "Save Action" : "Check and create Action"}</button></div>
  </form>;
}

function Section({ number, title, copy, children }: { number: string; title: string; copy: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800">{number}</span><div><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-sm text-slate-600">{copy}</p></div></div><div className="mt-5">{children}</div></section>; }
function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) { return <label className={`${wide ? "md:col-span-2 " : ""}text-sm font-semibold text-slate-800`}>{label}{hint ? <span className="font-normal text-slate-500"> ({hint})</span> : null}{children}</label>; }
function Handoff({ tone, eyebrow, title, children }: { tone: "blue" | "violet" | "fuchsia"; eyebrow: string; title: string; children: React.ReactNode }) { const colour = tone === "blue" ? "border-blue-200 bg-blue-50 text-blue-950" : tone === "violet" ? "border-violet-200 bg-violet-50 text-violet-950" : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950"; return <section className={`rounded-2xl border p-5 ${colour}`}><p className="text-xs font-black uppercase tracking-widest">{eyebrow}</p><h2 className="mt-1 text-lg font-black">{title}</h2><p className="mt-1 text-sm leading-6">{children}</p></section>; }
