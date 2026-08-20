import { notFound } from "next/navigation";
import { OrganisationDocumentBrand } from "@/components/organisation-document-brand";
import { requirePermission } from "@/lib/auth/dal";
import { auditEvidenceSourceLabel, auditScopeWhere, auditStatusLabel, calculateAuditScore } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const { id } = await params;
  const db = createDb();
  const audit = await db.audit.findFirst({
    where: { id, ...auditScopeWhere(context) },
    include: {
      template: { include: { sections: { include: { questions: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } } },
      auditor: { select: { name: true } }, location: { select: { name: true } }, signedOffBy: { select: { name: true } },
      responses: { include: { evidence: { select: { title: true, category: true, evidenceType: true, sourceReference: true } } } },
      findings: { orderBy: [{ severity: "desc" }, { createdAt: "asc" }] },
    },
  }).finally(() => db.$disconnect());
  if (!audit) notFound();

  const isBcp = audit.template.key === "business-continuity-audit";
  const documentTitle = isBcp ? "Business continuity assurance plan" : "Audit assurance report";
  const compliant = audit.responses.filter((item) => ["COMPLIANT", "YES"].includes(item.answer ?? "")).length;
  const partial = audit.responses.filter((item) => item.answer === "PARTIALLY_COMPLIANT").length;
  const nonCompliant = audit.responses.filter((item) => ["NON_COMPLIANT", "NO"].includes(item.answer ?? "")).length;

  return <main className="audit-print-document mx-auto max-w-6xl bg-white text-slate-900 print:max-w-none">
    <div className="print:hidden mb-4 flex justify-end p-4"><p className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">Press Ctrl+P to print or save as PDF</p></div>

    <header className="audit-print-masthead overflow-hidden bg-emerald-950 text-white">
      <div className="flex items-center justify-between gap-6 px-8 py-7">
        <div className="rounded-xl bg-white px-4 py-3"><OrganisationDocumentBrand name={context.organisation.name} hasLogo={Boolean(context.organisation.policyLogoStorageKey)} /></div>
        <div className="text-right"><p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Controlled governance document</p><p className="mt-2 text-sm text-emerald-50">{audit.template.name} · Version {audit.templateVersion}</p></div>
      </div>
      <div className="border-t border-white/15 bg-emerald-900 px-8 py-7"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">{isBcp ? "Resilience, response and recovery assurance" : audit.template.category}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{documentTitle}</h1><p className="mt-2 text-lg text-emerald-50">{audit.title}</p></div>
      <div className="grid grid-cols-2 gap-px bg-white/20 text-xs sm:grid-cols-4"><HeaderFact label="Organisation" value={context.organisation.name}/><HeaderFact label="Service / location" value={audit.location.name}/><HeaderFact label="Audit reference" value={`AUD-${audit.id.slice(0, 8).toUpperCase()}`}/><HeaderFact label="Generated" value={date(new Date())}/></div>
    </header>

    <div className="px-8 py-7 print:px-0">
      <section className="audit-print-section">
        <SectionHeading number="01" title="Document control and assurance position"/>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><ScoreCard label="Internal assurance score" value={audit.overallScore === null ? "Not scored" : `${audit.overallScore}%`} tone="emerald"/><ScoreCard label="Compliant controls" value={String(compliant)}/><ScoreCard label="Partial controls" value={String(partial)} tone={partial ? "amber" : "slate"}/><ScoreCard label="Non-compliant controls" value={String(nonCompliant)} tone={nonCompliant ? "red" : "slate"}/></div>
        <table className="audit-control-table mt-4 text-sm"><tbody><ControlRow left={["Document status", auditStatusLabel(audit.status)]} right={["Form and frequency", `${audit.template.name} · ${audit.template.frequency ?? "As scheduled"}`]}/><ControlRow left={["Audit lead", audit.auditor.name]} right={["Audit date", date(audit.auditDate)]}/><ControlRow left={["Period reviewed", `${date(audit.periodStart)} – ${date(audit.periodEnd)}`]} right={["Follow-up review", date(audit.reviewDate)]}/><ControlRow left={["Signed off by", audit.signedOffBy?.name ?? "Awaiting management sign-off"]} right={["Sign-off date", date(audit.signedOffAt)]}/></tbody></table>
      </section>

      <section className="audit-print-section mt-8">
        <SectionHeading number="02" title="Audit mandate, scope and sampling"/>
        <table className="audit-control-table mt-3 text-sm"><tbody><WideRow label="Objective" value={audit.objective}/><WideRow label="Scope" value={audit.scope}/><WideRow label="Standard or procedure tested" value={audit.standardApplied ?? audit.template.standardRefs.join(" · ")}/><WideRow label="Sampling approach" value={`${audit.sampleSize ?? "Not recorded"} item(s) · ${label(audit.sampleMethod ?? "method not recorded")}. ${audit.sampleDetails ?? "No further sample detail recorded."}`}/><WideRow label="Known limitations" value={audit.limitations ?? "No limitations recorded."}/></tbody></table>
      </section>

      <section className="mt-8">
        <SectionHeading number="03" title={isBcp ? "Business continuity control assessment" : "Control assessment"}/>
        <p className="mt-2 text-sm leading-6 text-slate-600">Each applicable conclusion should identify what was tested and a source another authorised reviewer can retrieve. The score supports internal assurance and is not an official regulator rating.</p>
        {audit.template.sections.map((section, sectionIndex) => <div key={section.id} className="audit-print-section mt-6">
          <div className="flex items-end justify-between border-b-2 border-emerald-800 pb-2"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Control area {sectionIndex + 1}</p><h2 className="mt-1 text-lg font-black">{section.title}</h2>{section.description ? <p className="mt-1 text-xs text-slate-500">{section.description}</p> : null}</div><strong className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-900">{sectionScore(section.questions, audit.responses)}</strong></div>
          <table className="audit-assessment-table mt-3 text-xs"><thead><tr><th className="w-12">Ref</th><th>Control tested</th><th className="w-28">Outcome</th><th>Finding and evidence trail</th></tr></thead><tbody>{section.questions.map((question, questionIndex) => {
            const response = audit.responses.find((item) => item.questionId === question.id);
            return <tr key={question.id}><td className="font-black text-emerald-800">{sectionIndex + 1}.{questionIndex + 1}</td><td><p className="font-semibold leading-5">{question.text}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Expected: {question.evidenceExpected ?? "Relevant supporting record"}</p></td><td><OutcomeBadge value={response?.answer ?? null}/></td><td><p className="whitespace-pre-wrap leading-5">{response?.comment ?? "No finding recorded."}</p><EvidenceTrail response={response}/></td></tr>;
          })}</tbody></table>
        </div>)}
      </section>

      <section className="audit-print-section mt-8">
        <SectionHeading number="04" title="Management conclusion and improvement priorities"/>
        <div className="mt-3 grid gap-3 sm:grid-cols-3"><Conclusion title="Strengths and reliable controls" value={audit.strengths}/><Conclusion title="Risks, gaps and limitations" value={audit.risks}/><Conclusion title="Recommendations and next steps" value={audit.recommendations}/></div>
        {audit.findings.length ? <table className="audit-assessment-table mt-5 text-xs"><thead><tr><th>Finding requiring action</th><th className="w-24">Severity</th><th>Required improvement</th><th className="w-24">Position</th></tr></thead><tbody>{audit.findings.map((finding) => <tr key={finding.id}><td className="font-semibold">{finding.summary}</td><td>{label(finding.severity)}</td><td>{finding.recommendation ?? "Create and complete a corrective action."}</td><td>{finding.resolvedAt ? `Resolved ${date(finding.resolvedAt)}` : "Open"}</td></tr>)}</tbody></table> : <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-950">No partial or non-compliant findings are currently recorded.</p>}
      </section>

      <section className="audit-print-section mt-8">
        <SectionHeading number="05" title="Approval and controlled distribution"/>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><Signature label="Audit completed by" name={audit.auditor.name} signedDate={audit.auditDate}/><Signature label="Management sign-off" name={audit.signedOffBy?.name ?? "Pending"} signedDate={audit.signedOffAt}/></div>
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-600"><strong>Controlled-copy note:</strong> This document is generated from the live QCGMS audit record. Printed or downloaded copies should be checked against the system before use. Personal names and sensitive care information should remain in their controlled source records and should not be duplicated unnecessarily.</p>
      </section>
    </div>

    <footer className="audit-report-footer border-t border-emerald-800 bg-slate-50 px-8 py-3 text-[10px] text-slate-500"><div className="flex justify-between gap-4"><span>{context.organisation.name} · {documentTitle}</span><span>AUD-{audit.id.slice(0, 8).toUpperCase()} · QCGMS controlled governance record</span></div></footer>
  </main>;
}

type ResponseForTrail = { evidenceSourceType: string | null; evidenceSourceReference: string | null; evidence: { title: string; category: string; evidenceType: string; sourceReference: string | null } | null } | undefined;
function EvidenceTrail({ response }: { response: ResponseForTrail }) { const source = auditEvidenceSourceLabel(response?.evidenceSourceType ?? null); if (!source && !response?.evidence && !response?.evidenceSourceReference) return <p className="mt-2 text-[10px] font-semibold text-amber-800">Evidence source not recorded</p>; return <div className="mt-2 border-l-2 border-emerald-600 pl-2 text-[10px] leading-4 text-slate-600"><p><strong>Source:</strong> {source ?? "Controlled Evidence Library record"}</p>{response?.evidenceSourceReference ? <p><strong>Reference:</strong> {response.evidenceSourceReference}</p> : null}{response?.evidence ? <p><strong>Linked record:</strong> {response.evidence.title} · {response.evidence.category} · {response.evidence.evidenceType}{response.evidence.sourceReference ? ` · ${response.evidence.sourceReference}` : ""}</p> : null}</div>; }
function HeaderFact({ label: term, value }: { label: string; value: string }) { return <div className="bg-emerald-950 px-5 py-3"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">{term}</p><p className="mt-1 font-semibold text-white">{value}</p></div>; }
function SectionHeading({ number, title }: { number: string; title: string }) { return <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-emerald-800 text-xs font-black text-white">{number}</span><h2 className="text-xl font-black text-slate-900">{title}</h2></div>; }
function ScoreCard({ label: term, value, tone = "slate" }: { label: string; value: string; tone?: "emerald" | "amber" | "red" | "slate" }) { const colours = { emerald: "border-emerald-300 bg-emerald-50 text-emerald-950", amber: "border-amber-300 bg-amber-50 text-amber-950", red: "border-red-300 bg-red-50 text-red-950", slate: "border-slate-200 bg-slate-50 text-slate-900" }; return <div className={`rounded-xl border p-4 ${colours[tone]}`}><p className="text-[10px] font-black uppercase tracking-wider opacity-70">{term}</p><p className="mt-1 text-2xl font-black">{value}</p></div>; }
function ControlRow({ left, right }: { left: [string, string]; right: [string, string] }) { return <tr><th>{left[0]}</th><td>{left[1]}</td><th>{right[0]}</th><td>{right[1]}</td></tr>; }
function WideRow({ label: term, value }: { label: string; value: string | null }) { return <tr><th className="w-48">{term}</th><td colSpan={3} className="whitespace-pre-wrap">{value ?? "Not recorded."}</td></tr>; }
function Conclusion({ title, value }: { title: string; value: string | null }) { return <div className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-black text-emerald-900">{title}</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{value ?? "None recorded."}</p></div>; }
function Signature({ label: term, name, signedDate }: { label: string; name: string; signedDate: Date | null }) { return <div className="rounded-xl border border-slate-300 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{term}</p><p className="mt-3 font-bold">{name}</p><div className="mt-8 border-t border-slate-400 pt-2 text-xs text-slate-500">Signature / approval record · {date(signedDate)}</div></div>; }
function OutcomeBadge({ value }: { value: string | null }) { const tone = value === "COMPLIANT" || value === "YES" ? "bg-emerald-100 text-emerald-900" : value === "PARTIALLY_COMPLIANT" ? "bg-amber-100 text-amber-900" : value === "NON_COMPLIANT" || value === "NO" ? "bg-red-100 text-red-900" : "bg-slate-100 text-slate-700"; return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${tone}`}>{value ? label(value) : "Not answered"}</span>; }
function date(value: Date | null) { return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value) : "Not set"; }
function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()); }
function sectionScore(questions: { id: string; weighting: number }[], responses: { questionId: string; score: number | null }[]) { const score = calculateAuditScore(questions.map((question) => ({ score: responses.find((response) => response.questionId === question.id)?.score ?? null, weighting: question.weighting }))); return score === null ? "Not scored" : `${score}%`; }
