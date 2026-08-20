"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AUDIT_EVIDENCE_SOURCE_OPTIONS, COMPLIANCE_ANSWERS } from "@/lib/audits";

type Question = {
  id: string;
  text: string;
  guidance: string | null;
  evidenceExpected: string | null;
  responseType: string;
  options: string[];
  mandatory: boolean;
  requiresEvidence: boolean;
  weighting: number;
};
type Section = { id: string; title: string; description: string | null; questions: Question[] };
type Saved = { questionId: string; answer: string | null; comment: string | null; evidenceId: string | null; evidenceSourceType: string | null; evidenceSourceReference: string | null };
type ResponseValue = { answer: string; comment: string; evidenceId: string; evidenceSourceType: string; evidenceSourceReference: string };
type EvidenceOption = { id: string; title: string; category: string; evidenceType: string; sourceName: string | null; sourceReference: string | null };

const EMPTY_RESPONSE: ResponseValue = { answer: "", comment: "", evidenceId: "", evidenceSourceType: "", evidenceSourceReference: "" };

export function AuditAssessmentForm({ auditId, sections, saved, evidence, summary, readOnly }: {
  auditId: string;
  sections: Section[];
  saved: Saved[];
  evidence: EvidenceOption[];
  summary: { strengths: string; risks: string; recommendations: string; reviewDate: string };
  readOnly: boolean;
}) {
  const router = useRouter();
  const initial = Object.fromEntries(saved.map((item) => [item.questionId, {
    answer: item.answer ?? "",
    comment: item.comment ?? "",
    evidenceId: item.evidenceId ?? "",
    evidenceSourceType: item.evidenceSourceType ?? (item.evidenceId ? "EVIDENCE_LIBRARY" : ""),
    evidenceSourceReference: item.evidenceSourceReference ?? "",
  }]));
  const [values, setValues] = useState<Record<string, ResponseValue>>(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const questions = useMemo(() => sections.flatMap((section) => section.questions), [sections]);
  const answered = questions.filter((question) => Boolean(values[question.id]?.answer)).length;
  const completion = questions.length ? Math.round(answered / questions.length * 100) : 0;

  const update = (id: string, key: keyof ResponseValue, value: string) => setValues((current) => ({ ...current, [id]: { ...(current[id] ?? EMPTY_RESPONSE), [key]: value } }));
  const linkEvidence = (id: string, evidenceId: string) => setValues((current) => {
    const existing = current[id] ?? EMPTY_RESPONSE;
    return { ...current, [id]: { ...existing, evidenceId, evidenceSourceType: evidenceId && !existing.evidenceSourceType ? "EVIDENCE_LIBRARY" : existing.evidenceSourceType } };
  });

  async function save(intent: "save" | "submit", form: HTMLFormElement) {
    setBusy(true);
    setError("");
    const data = new FormData(form);
    const response = await fetch(`/api/audits/${auditId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent,
        responses: questions.map((question) => ({ questionId: question.id, ...(values[question.id] ?? EMPTY_RESPONSE) })),
        strengths: data.get("strengths"), risks: data.get("risks"), recommendations: data.get("recommendations"), reviewDate: data.get("reviewDate"),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not save audit."); setBusy(false); return; }
    setBusy(false);
    router.refresh();
  }

  if (!questions.length) return <section id="audit-form" className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="text-xl font-bold">Audit form is not available</h2><p className="mt-2 text-sm">This template has no questions. Ask an administrator to publish a complete audit template before using it.</p></section>;

  return <form id="audit-form" onSubmit={(event) => { event.preventDefault(); void save("save", event.currentTarget); }} className="space-y-6">
    <section className="rounded-2xl border border-emerald-200 bg-emerald-950 p-5 text-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">{readOnly ? "Completed record" : "Complete this audit form"}</p><h2 className="mt-1 text-2xl font-bold">{answered} of {questions.length} questions answered</h2><p className="mt-1 text-sm text-emerald-50/75">{readOnly ? "The form is read-only because this audit has progressed beyond assessment." : "Save at any time. Mandatory questions and required evidence locators are checked before review."}</p></div><strong className="text-3xl">{completion}%</strong></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${completion}%` }} /></div>
    </section>

    {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

    {sections.map((section, sectionIndex) => <section key={section.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="border-b border-slate-200 pb-4"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Section {sectionIndex + 1}</p><h2 className="mt-1 text-xl font-bold">{section.title}</h2>{section.description ? <p className="mt-1 text-sm text-slate-600">{section.description}</p> : null}</div>
      <div className="divide-y divide-slate-200">{section.questions.map((question, index) => {
        const value = values[question.id] ?? EMPTY_RESPONSE;
        return <fieldset key={question.id} className="py-6">
          <legend className="flex w-full gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{index + 1}</span><span><span className="font-semibold">{question.text}{question.mandatory ? <span className="text-red-600"> *</span> : null}</span>{question.guidance ? <span className="mt-1 block text-sm font-normal text-slate-500">{question.guidance}</span> : null}<span className="mt-1 block text-xs font-normal text-slate-400">Evidence to check: {question.evidenceExpected ?? "Relevant supporting records"}</span></span></legend>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <label className="text-sm font-medium">Finding or response<AnswerControl question={question} value={value.answer} onChange={(answer) => update(question.id, "answer", answer)} disabled={readOnly} /></label>
            <label className="text-sm font-medium lg:col-span-2">What you checked and found<textarea disabled={readOnly} value={value.comment} onChange={(event) => update(question.id, "comment", event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" placeholder="State the sample, result, good practice, gap, immediate control and required action. Avoid people's names." /><span className="mt-1 block text-xs font-normal text-slate-500">Record what was tested and the conclusion; keep the exact source locator below.</span></label>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-emerald-950">Supporting evidence source</p><p className="mt-0.5 text-xs font-normal text-emerald-900">Choose the source used, record the exact locator and link the controlled Evidence Library item where available.</p></div>{question.requiresEvidence ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">Traceable evidence required</span> : null}</div>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <label className="text-xs font-bold text-slate-700">Source type<select disabled={readOnly} value={value.evidenceSourceType} onChange={(event) => update(question.id, "evidenceSourceType", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal disabled:bg-slate-100"><option value="">Choose evidence source</option>{sourceGroups().map(([group, options]) => <optgroup key={group} label={group}>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select></label>
                <label className="text-xs font-bold text-slate-700">Source reference or exact location<input disabled={readOnly} value={value.evidenceSourceReference} onChange={(event) => update(question.id, "evidenceSourceReference", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal disabled:bg-slate-100" maxLength={220} placeholder="e.g. BCP exercise BCP-2026-03, page 7" /></label>
                <label className="text-xs font-bold text-slate-700">Controlled Evidence Library record<select disabled={readOnly} value={value.evidenceId} onChange={(event) => linkEvidence(question.id, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal disabled:bg-slate-100"><option value="">No controlled record linked</option>{evidenceGroups(evidence).map(([group, options]) => <optgroup key={group} label={group}>{options.map((item) => <option key={item.id} value={item.id}>{item.title}{item.sourceReference ? ` · ${item.sourceReference}` : ""}</option>)}</optgroup>)}</select></label>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">If the source is outside QCGMS, select its type and enter a precise reference that another authorised reviewer can retrieve. Do not enter passwords or unnecessary personal data.</p>
            </div>
          </div>
        </fieldset>;
      })}</div>
    </section>)}

    <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">Audit conclusion</h2><p className="mt-1 text-sm text-slate-600">Summarise the assurance gained, main risks and next steps.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{[["strengths", "Strengths"], ["risks", "Risks and gaps"], ["recommendations", "Recommendations"]].map(([name, label]) => <label key={name} className="text-sm font-medium">{label}<textarea disabled={readOnly} name={name} defaultValue={summary[name as keyof typeof summary]} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>)}<label className="text-sm font-medium">Follow-up review date<input disabled={readOnly} name="reviewDate" type="date" defaultValue={summary.reviewDate} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label></div></section>

    {!readOnly ? <div className="sticky bottom-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur"><button disabled={busy} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold">{busy ? "Saving…" : "Save progress"}</button><button disabled={busy} type="button" onClick={(event) => { if (event.currentTarget.form) void save("submit", event.currentTarget.form); }} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Submit completed form for review</button></div> : null}
  </form>;
}

function AnswerControl({ question, value, onChange, disabled }: { question: Question; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const options = question.responseType === "COMPLIANCE" ? COMPLIANCE_ANSWERS : question.responseType === "YES_NO" ? ["YES", "NO", "NOT_APPLICABLE"] : question.responseType === "MULTIPLE_CHOICE" ? question.options : null;
  const className = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100";
  if (options) return <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className={className}><option value="">Choose response</option>{options.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())}</option>)}</select>;
  return <input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} type={question.responseType === "NUMBER" ? "number" : question.responseType === "DATE" ? "date" : "text"} className={className} placeholder="Enter response" />;
}

function sourceGroups() {
  return [...new Set(AUDIT_EVIDENCE_SOURCE_OPTIONS.map((item) => item.group))].map((group) => [group, AUDIT_EVIDENCE_SOURCE_OPTIONS.filter((item) => item.group === group)] as const);
}

function evidenceGroups(evidence: EvidenceOption[]) {
  return [...new Set(evidence.map((item) => item.category || "Other"))].sort().map((group) => [group, evidence.filter((item) => (item.category || "Other") === group)] as const);
}
