"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormPurpose } from "@/components/form-purpose";
import { AGENDA_TOPICS, MEETING_STATUSES, MEETING_TYPES, meetingLabel } from "@/lib/meetings";

type Option = { id: string; name: string };
type Agenda = { id?: string; linkedActionId?: string; topic: string; title: string; notes: string; decision: string };
type Initial = { id: string; reference: string; title: string; meetingType: string; meetingDate: string; meetingTime: string; locationOrLink: string; locationId: string; chairId: string; reportingPeriod: string; previousActionIds: string[]; attendeeIds: string[]; apologyIds: string[]; kpiReview: string; auditFindings: string; complaints: string; incidents: string; safeguarding: string; workforce: string; risks: string; qualityImprovement: string; decisions: string; minutes: string; status: string; approvedById: string; approvalDate: string; nextMeetingDate: string; evidenceIds: string[]; agenda: Agenda[] };

const MONTHLY_AGENDA: Agenda[] = [
  { topic: "Previous actions", title: "Review actions from the previous meeting", notes: "", decision: "" },
  { topic: "People receiving care", title: "People, outcomes and experience", notes: "", decision: "" },
  { topic: "KPI review", title: "Performance, trends and exceptions", notes: "", decision: "" },
  { topic: "Audit findings", title: "Audit findings and assurance gaps", notes: "", decision: "" },
  { topic: "Complaints", title: "Complaints, compliments and learning", notes: "", decision: "" },
  { topic: "Incidents", title: "Incidents, safeguarding and medicines", notes: "", decision: "" },
  { topic: "Workforce", title: "Workforce, training and competency", notes: "", decision: "" },
  { topic: "Risks", title: "Top risks, controls and escalation", notes: "", decision: "" },
  { topic: "Quality improvement", title: "Improvement priorities and next steps", notes: "", decision: "" },
];

export function MeetingForm({ members, locations, evidence, openActions, initial }: { members: Option[]; locations: Option[]; evidence: Option[]; openActions: Option[]; initial?: Initial }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [agenda, setAgenda] = useState<Agenda[]>(initial?.agenda.length ? initial.agenda : MONTHLY_AGENDA.slice(0, 3));
  const cls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(initial ? `/api/meetings/${initial.id}` : "/api/meetings", { method: initial ? "PATCH" : "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "The meeting could not be saved. Check the information and try again."); setBusy(false); return; }
    router.push(`/meetings/${initial?.id ?? result.id}`); router.refresh();
  }
  function change(index: number, key: keyof Agenda, value: string) { setAgenda((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)); }

  return <form onSubmit={submit} className="space-y-7">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <FormPurpose title="Run a meeting that leaves a clear trail" description="Prepare the agenda, show what was reviewed, record each decision and turn agreed work into owned actions. Approved minutes automatically appear in the Evidence Library." steps={["Prepare and invite", "Meet, decide and assign", "Approve and evidence"]} />
      <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-950"><strong>Prefer to speak?</strong> Click any notes, decision or minutes box, then choose <strong>Voice type</strong>. Read the text back before saving.</p>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</p>}

    <Section number="1" title="Purpose and practical details" description="Make it obvious why the meeting is taking place, who is accountable and which service it covers."><div className="grid gap-4 md:grid-cols-2">
      <Field label="Meeting reference" hint="created automatically if blank"><input name="reference" className={cls} defaultValue={initial?.reference} readOnly={Boolean(initial)} /></Field>
      <Field label="Meeting type"><select name="meetingType" className={cls} defaultValue={initial?.meetingType ?? "Monthly governance"}>{MEETING_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Meeting title" wide><input name="title" className={cls} required minLength={3} defaultValue={initial?.title} placeholder="For example, July quality and safety review" /></Field>
      <Field label="Date"><input name="meetingDate" type="date" className={cls} required defaultValue={initial?.meetingDate ?? new Date().toISOString().slice(0, 10)} /></Field><Field label="Time"><input name="meetingTime" type="time" className={cls} required defaultValue={initial?.meetingTime ?? "10:00"} /></Field>
      <Field label="Room or video link" wide><input name="locationOrLink" className={cls} required defaultValue={initial?.locationOrLink} placeholder="Meeting room or secure link" /></Field>
      <Field label="Service location"><select name="locationId" className={cls} defaultValue={initial?.locationId ?? ""}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Chair"><select name="chairId" required className={cls} defaultValue={initial?.chairId ?? ""}><option value="">Choose the accountable chair</option>{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Period being reviewed"><input name="reportingPeriod" className={cls} placeholder="For example, July 2026" defaultValue={initial?.reportingPeriod} /></Field><Field label="Next meeting date"><input name="nextMeetingDate" type="date" className={cls} defaultValue={initial?.nextMeetingDate} /></Field>
    </div></Section>

    <Section number="2" title="People and previous commitments" description="Tick who attended, who sent apologies and which open actions must be reviewed."><div className="grid gap-5 lg:grid-cols-2"><CheckList label="Attended" name="attendeeIds" options={members} defaults={initial?.attendeeIds ?? []} empty="No active members are available." /><CheckList label="Apologies" name="apologyIds" options={members} defaults={initial?.apologyIds ?? []} empty="No active members are available." /></div><div className="mt-5"><CheckList label="Open actions to bring forward" name="previousActionIds" options={openActions} defaults={initial?.previousActionIds ?? []} empty="There are no open actions to bring forward." /></div></Section>

    <Section number="3" title="Agenda, discussion and decisions" description="Use one item for each subject. During the meeting, add the discussion and the exact decision beneath it.">
      <div className="flex flex-wrap gap-2">{!initial && <button type="button" onClick={() => setAgenda(MONTHLY_AGENDA)} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">Load full monthly agenda</button>}<button type="button" onClick={() => setAgenda((items) => [...items, { topic: "Any other business", title: "", notes: "", decision: "" }])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Add agenda item</button></div>
      <div className="mt-4 space-y-4">{agenda.map((item, index) => <article key={item.id ?? index} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><input type="hidden" name="agendaItemId" value={item.id ?? ""} /><input type="hidden" name="agendaLinkedActionId" value={item.linkedActionId ?? ""} /><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-emerald-800">Agenda item {index + 1}</p><button type="button" disabled={Boolean(item.linkedActionId)} title={item.linkedActionId ? "This item has a linked action and must remain on the record." : undefined} onClick={() => setAgenda((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:text-slate-400">Remove</button></div>
        <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr]"><label className="text-sm font-medium">Subject<select name="agendaTopic" value={item.topic} onChange={(event) => change(index, "topic", event.target.value)} className={cls}>{AGENDA_TOPICS.map((topic) => <option key={topic}>{topic}</option>)}</select></label><label className="text-sm font-medium">What needs to be discussed?<input name="agendaTitle" value={item.title} onChange={(event) => change(index, "title", event.target.value)} placeholder="Clear agenda item" className={cls} required /></label></div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2"><label className="text-sm font-medium">Discussion and evidence reviewed<textarea name="agendaNotes" value={item.notes} onChange={(event) => change(index, "notes", event.target.value)} placeholder="Summarise the evidence, challenge and assurance discussed" className={`${cls} min-h-28`} /></label><label className="text-sm font-medium">Decision or agreed position<textarea name="agendaDecision" value={item.decision} onChange={(event) => change(index, "decision", event.target.value)} placeholder="Record what was agreed, deferred or escalated" className={`${cls} min-h-28`} /></label></div>{item.linkedActionId && <p className="mt-3 text-xs font-semibold text-emerald-800">An action has already been created from this item and will stay linked.</p>}
      </article>)}</div>
    </Section>

    <Section number="4" title="Assurance review" description="Capture the headlines that senior managers, commissioners or inspectors would need to understand."><div className="grid gap-4 md:grid-cols-2">{[["kpiReview", "Performance and KPI exceptions", "What improved, deteriorated or needs explanation?"], ["auditFindings", "Audit findings", "What assurance or gaps did audits identify?"], ["complaints", "Complaints, compliments and feedback", "What themes and learning were discussed?"], ["incidents", "Incidents and medicines", "What trends, investigations or learning need oversight?"], ["safeguarding", "Safeguarding and duty of candour", "What required assurance, escalation or notification?"], ["workforce", "Workforce", "Cover staffing, recruitment, training, competency and wellbeing."], ["risks", "Risks", "Which risks changed and are controls effective?"], ["qualityImprovement", "Quality improvement", "What progress, benefit or barrier was reviewed?"]].map(([name, label, placeholder]) => <Field key={name} label={label}><textarea name={name} className={`${cls} min-h-28`} placeholder={placeholder} defaultValue={initial?.[name as keyof Initial] as string} /></Field>)}</div></Section>

    <Section number="5" title="Meeting summary and approval" description="Finish with a plain-English summary, approve the minutes and connect the supporting evidence."><div className="grid gap-4 md:grid-cols-2"><Field label="Decision summary"><textarea name="decisions" className={`${cls} min-h-32`} placeholder="List the main decisions, including anything escalated or deferred" defaultValue={initial?.decisions} /></Field><Field label="Formal minutes"><textarea name="minutes" className={`${cls} min-h-32`} placeholder="Summarise the meeting, assurance received, challenge, learning and follow-up" defaultValue={initial?.minutes} /></Field></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Record status"><select name="status" className={cls} defaultValue={initial?.status ?? "DRAFT"}>{MEETING_STATUSES.filter((item) => item !== "ARCHIVED").map((item) => <option key={item} value={item}>{meetingLabel(item)}</option>)}</select></Field><Field label="Approved by"><select name="approvedById" className={cls} defaultValue={initial?.approvedById ?? ""}><option value="">Not approved yet</option>{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Approval date"><input name="approvalDate" type="date" className={cls} defaultValue={initial?.approvalDate} /></Field></div><p className="mt-3 text-xs text-slate-600">Choose <strong>Approved</strong> only when the formal minutes are complete and the approver and approval date are recorded.</p><div className="mt-5"><CheckList label="Supporting records from the Evidence Library" name="evidenceIds" options={evidence} defaults={initial?.evidenceIds ?? []} empty="No evidence records are available to link." /></div>
    </Section>

    <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-lg backdrop-blur"><p className="text-sm text-slate-600">The record, activity history, calendar date and Evidence Library link update together.</p><button disabled={busy} className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving meeting…" : initial ? "Save meeting record" : "Create meeting record"}</button></div>
  </form>;
}

function Section({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) { return <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><legend className="sr-only">{title}</legend><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-900">{number}</span><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div></div><div className="mt-5">{children}</div></fieldset>; }
function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) { return <label className={`${wide ? "md:col-span-2 " : ""}text-sm font-medium`}>{label}{hint && <span className="font-normal text-slate-500"> ({hint})</span>}{children}</label>; }
function CheckList({ label, name, options, defaults, empty }: { label: string; name: string; options: Option[]; defaults: string[]; empty: string }) { return <fieldset><legend className="text-sm font-bold">{label}</legend><div className="mt-2 max-h-56 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">{options.length ? options.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white px-3 py-2 text-sm hover:bg-emerald-50"><input type="checkbox" name={name} value={item.id} defaultChecked={defaults.includes(item.id)} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span>{item.name}</span></label>) : <p className="p-2 text-sm text-slate-500">{empty}</p>}</div></fieldset>; }
