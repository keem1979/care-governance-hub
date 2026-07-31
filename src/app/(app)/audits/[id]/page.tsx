import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditActions } from "@/components/audit-actions";
import { AuditAssessmentForm } from "@/components/audit-form";
import { requireAnyPermission } from "@/lib/auth/dal";
import { auditScopeWhere, auditStatusLabel, calculateAuditScore } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.AUDITS_COMPLETE]);
  const { id } = await params;
  const db = createDb();
  try {
    const audit = await db.audit.findFirst({
      where: { id, ...auditScopeWhere(context) },
      include: {
        template: { include: { sections: { include: { questions: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } } },
        auditor: { select: { name: true } },
        location: { select: { name: true } },
        signedOffBy: { select: { name: true } },
        responses: true,
        findings: { include: { response: { include: { question: { select: { text: true } } } } }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!audit) notFound();
    const evidence = await db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true }, orderBy: { title: "asc" } });
    const canEdit = hasPermission(context.permissions, PERMISSIONS.AUDITS_COMPLETE) && !["COMPLETED", "CLOSED", "ARCHIVED"].includes(audit.status);
    const canGovern = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
    const questionCount = audit.template.sections.reduce((sum, section) => sum + section.questions.length, 0);
    const answeredCount = audit.responses.filter((response) => response.answer).length;
    const sectionScores = audit.template.sections.map((section) => ({
      title: section.title,
      score: calculateAuditScore(section.questions.map((question) => ({ score: audit.responses.find((response) => response.questionId === question.id)?.score ?? null, weighting: question.weighting }))),
    }));
    return <main className="space-y-6">
      <div><Link href="/audits" className="text-sm font-semibold text-emerald-700">Back to Audit Centre</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">{audit.template.name} · v{audit.templateVersion}</p><h1 className="text-3xl font-bold">{audit.title}</h1><p className="mt-1 text-slate-600">{audit.location.name} · {audit.auditor.name} · {auditStatusLabel(audit.status)}</p></div><div className="flex flex-wrap gap-2"><Link href={`/audits/${id}/report`} target="_blank" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Print report</Link>{canGovern ? <AuditActions id={id} status={audit.status} /> : null}</div></div></div>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step 2 of 2 · Audit form</p><h2 className="mt-1 text-lg font-bold">{answeredCount} of {questionCount} questions answered</h2><p className="mt-1 text-sm text-emerald-900">{canEdit ? "Complete the form below, save your progress, then submit it for management review." : "The completed audit form is shown below as a read-only governance record."}</p></div><a href="#audit-form" className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">{canEdit ? "Go to form" : "View form"}</a></div></section>

      <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Overall score</p><p className="mt-1 text-3xl font-bold">{audit.overallScore === null ? "—" : `${audit.overallScore}%`}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Open findings</p><p className="mt-1 text-3xl font-bold">{audit.findings.filter((item) => !item.resolvedAt).length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Sign-off</p><p className="mt-2 font-bold">{audit.signedOffBy?.name ?? "Not signed off"}</p></div></section>

      {sectionScores.some((item) => item.score !== null) ? <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Section scores</h2><div className="mt-3 grid gap-3 md:grid-cols-3">{sectionScores.map((item) => <div key={item.title} className="rounded-lg bg-slate-50 p-3 text-sm"><span>{item.title}</span><strong className="float-right">{item.score === null ? "—" : `${item.score}%`}</strong></div>)}</div></section> : null}

      {audit.findings.length > 0 ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="text-xl font-bold">Automatic findings</h2><div className="mt-4 space-y-3">{audit.findings.map((finding) => <div key={finding.id} className="rounded-xl bg-white p-4"><div className="flex justify-between gap-3"><strong>{finding.summary}</strong><span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">{finding.severity}</span></div><p className="mt-1 text-sm text-slate-600">{finding.recommendation}</p>{finding.actionRequired ? <p className="mt-2 text-xs font-semibold text-amber-800">Corrective action required</p> : null}</div>)}</div></section> : null}

      <AuditAssessmentForm
        auditId={id}
        sections={audit.template.sections}
        saved={audit.responses.map((item) => ({ questionId: item.questionId, answer: item.answer, comment: item.comment, evidenceId: item.evidenceId }))}
        evidence={evidence}
        summary={{ strengths: audit.strengths ?? "", risks: audit.risks ?? "", recommendations: audit.recommendations ?? "", reviewDate: audit.reviewDate?.toISOString().slice(0, 10) ?? "" }}
        readOnly={!canEdit}
      />
    </main>;
  } finally { await db.$disconnect(); }
}
