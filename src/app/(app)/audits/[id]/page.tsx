import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditActions } from "@/components/audit-actions";
import { AuditAssessmentForm } from "@/components/audit-form";
import { AuditFindingControls } from "@/components/audit-finding-controls";
import { requireAnyPermission } from "@/lib/auth/dal";
import { auditScopeWhere, auditStatusLabel, calculateAuditScore } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { auditAssuranceReadiness, auditDenominator } from "@/lib/audit-assurance";

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
        fieldworkCompletedBy: { select: { name: true } },
        governanceAssuredBy: { select: { name: true } },
        findings: { include: { response: { include: { question: { select: { text: true, mandatory: true, weighting: true } } } }, action: { select: { id: true, reference: true, status: true, closedAt: true, lifecycleStatus: true, effectivenessReviews: { orderBy: { reviewDate: "desc" }, take: 1, select: { outcome: true } } } }, evidenceLinks: { where: { retiredAt: null }, include: { evidence: { select: { id: true, title: true } } }, orderBy: { linkedAt: "desc" } }, reaudits: { include: { reviewer: { select: { name: true } }, evidenceLinks: { include: { evidence: { select: { id: true, title: true } } } } }, orderBy: { reviewDate: "desc" } }, resolvedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!audit) notFound();
    const generatedEvidence=await db.evidence.findFirst({where:{organisationId:context.organisation.id,relatedModule:"Audit",relatedRecordId:id},select:{id:true,status:true}});
    const evidence = await db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true, category: true, evidenceType: true, sourceName: true, sourceReference: true }, orderBy: [{ category: "asc" }, { title: "asc" }] });
    const canEdit = hasPermission(context.permissions, PERMISSIONS.AUDITS_COMPLETE) && !["COMPLETED", "CLOSED", "ARCHIVED"].includes(audit.status);
    const canGovern = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
    const questionCount = audit.template.sections.reduce((sum, section) => sum + section.questions.length, 0);
    const answeredCount = audit.responses.filter((response) => response.answer).length;
    const sectionScores = audit.template.sections.map((section) => ({
      title: section.title,
      score: calculateAuditScore(section.questions.map((question) => ({ score: audit.responses.find((response) => response.questionId === question.id)?.score ?? null, weighting: question.weighting }))),
    }));
    const mandatoryQuestions=audit.template.sections.flatMap(section=>section.questions).filter(question=>question.mandatory),answeredQuestionIds=new Set(audit.responses.filter(response=>response.answer).map(response=>response.questionId));
    const assurance=auditAssuranceReadiness({status:audit.status,mandatoryQuestionCount:mandatoryQuestions.length,mandatoryAnsweredCount:mandatoryQuestions.filter(question=>answeredQuestionIds.has(question.id)).length,fieldworkCompletedAt:audit.fieldworkCompletedAt,findings:audit.findings});
    const responseWeights=new Map(audit.template.sections.flatMap(section=>section.questions.map(question=>[question.id,question.weighting] as const))), denominator=auditDenominator(audit.responses.map(response=>({answer:response.answer,score:response.score,weighting:responseWeights.get(response.questionId)??1})));
    const recurringKeys=audit.findings.length?await db.auditFinding.groupBy({by:["criterionKeySnapshot"],where:{criterionKeySnapshot:{in:audit.findings.map(finding=>finding.criterionKeySnapshot)},audit:{organisationId:context.organisation.id,locationId:audit.locationId},id:{notIn:audit.findings.map(finding=>finding.id)}},_count:{_all:true}}):[];
    const recurrenceMap=new Map(recurringKeys.map(item=>[item.criterionKeySnapshot,item._count._all]));
    const hasCriticalOpen=audit.findings.some(finding=>finding.severity==="CRITICAL"&&!finding.resolvedAt);
    return <main className="space-y-6">
      <div><Link href="/audits" className="text-sm font-semibold text-emerald-700">Back to Audit Centre</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">{audit.template.category} · {audit.template.name} · v{audit.templateVersion}</p><h1 className="text-3xl font-bold">{audit.title}</h1><p className="mt-1 text-slate-600">{audit.location.name} · {audit.auditor.name} · {auditStatusLabel(audit.status)}</p></div><div className="flex flex-wrap gap-2">{generatedEvidence?<Link href={`/evidence/${generatedEvidence.id}`} className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800">Open synced evidence</Link>:null}<Link href={`/audits/${id}/report`} target="_blank" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Print report</Link>{canGovern ? <AuditActions id={id} status={audit.status} outstanding={assurance.outstanding.map(({label,reason})=>({label,reason}))}/> : null}</div></div></div>

      {hasCriticalOpen?<section role="alert" className="rounded-2xl border-2 border-red-500 bg-red-50 p-5 text-red-950"><p className="text-xs font-black uppercase tracking-widest">Critical finding overrides score</p><h2 className="mt-1 text-xl font-black">Immediate control, escalation and closed-loop assurance are required.</h2><p className="mt-1 text-sm">A high percentage must not obscure an unresolved Critical finding. Audit governance closure is blocked.</p></section>:null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Info label="Objective" value={audit.objective??"Not recorded"}/><Info label="Sample" value={`${audit.sampleSize??"—"} · ${audit.sampleMethod?.replaceAll("_"," ").toLowerCase()??"method not recorded"}`}/><Info label="Standard tested" value={audit.standardApplied??audit.template.standardRefs.join(" · ")}/><Info label="Known limitations" value={audit.limitations??"None recorded"}/></div>{audit.sampleDetails?<p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600"><strong>Sample details:</strong> {audit.sampleDetails}</p>:null}</section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step 2 of 2 · Audit form</p><h2 className="mt-1 text-lg font-bold">{answeredCount} of {questionCount} questions answered</h2><p className="mt-1 text-sm text-emerald-900">{canEdit ? "Complete the form below, save your progress, then submit it for management review." : "The completed audit form is shown below as a read-only governance record."}</p></div><a href="#audit-form" className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">{canEdit ? "Go to form" : "View form"}</a></div></section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Internal assurance score</p><p className="mt-1 text-3xl font-bold">{audit.overallScore === null ? "—" : `${audit.overallScore}%`}</p><p className="mt-1 text-xs text-slate-500">{denominator.applicableCount} applicable · {denominator.notApplicableCount} N/A · weighted denominator {denominator.denominator}. Not a CQC rating.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Open findings</p><p className="mt-1 text-3xl font-bold">{audit.findings.filter((item) => !item.resolvedAt).length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Fieldwork</p><p className="mt-2 font-bold">{audit.fieldworkCompletedBy?.name??"Awaiting completion"}</p><p className="mt-1 text-xs text-slate-500">{audit.fieldworkCompletedAt?formatDate(audit.fieldworkCompletedAt):"Not yet signed off"}</p></div><div className={`rounded-2xl border p-5 ${assurance.ready?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50"}`}><p className="text-sm text-slate-600">Management assurance</p><p className="mt-2 font-bold">{audit.governanceAssuredBy?.name??(assurance.ready?"Ready for authorised closure":"Outstanding requirements")}</p><p className="mt-1 text-xs text-slate-600">{audit.governanceAssuredAt?formatDate(audit.governanceAssuredAt):`${assurance.outstanding.length} condition(s) outstanding`}</p></div></section>

      {sectionScores.some((item) => item.score !== null) ? <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Section scores</h2><div className="mt-3 grid gap-3 md:grid-cols-3">{sectionScores.map((item) => <div key={item.title} className="rounded-lg bg-slate-50 p-3 text-sm"><span>{item.title}</span><strong className="float-right">{item.score === null ? "—" : `${item.score}%`}</strong></div>)}</div></section> : null}

      {audit.findings.length > 0 ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><div><h2 className="text-xl font-bold">Closed-loop Audit Findings</h2><p className="mt-1 text-sm text-amber-900">Each finding retains its criterion, Evidence, one canonical Action, targeted re-audits and an attributable resolution decision.</p></div><div className="mt-4 space-y-4">{audit.findings.map((finding) => {const repeats=recurrenceMap.get(finding.criterionKeySnapshot)??0,latest=finding.reaudits[0],assuranceConflict=repeats>0&&finding.action?.effectivenessReviews[0]?.outcome==="EFFECTIVE";return <article id={`finding-${finding.id}`} key={finding.id} className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><strong>{finding.summary}</strong><p className="mt-1 text-xs text-slate-500">Criterion {finding.criterionKeySnapshot}</p></div><div className="flex gap-2"><span className={`rounded-full px-2 py-1 text-xs font-bold ${finding.severity==="CRITICAL"?"bg-red-700 text-white":"bg-red-100 text-red-800"}`}>{finding.severity}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${finding.resolvedAt?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-900"}`}>{finding.resolvedAt?"RESOLVED":"OPEN"}</span></div></div><p className="mt-2 text-sm text-slate-700">{finding.recommendation}</p>{repeats>0?<p className="mt-2 rounded-lg bg-violet-50 p-2 text-xs font-bold text-violet-900">Recurring criterion: {repeats} earlier finding(s) at this location.</p>:null}{assuranceConflict?<p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-bold text-red-900">Potential assurance conflict: this criterion recurred after a linked Action was rated Effective. Review the effectiveness decision; QCGMS has not changed it automatically.</p>:null}<div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4"><Info label="Immediate control" value={finding.immediateControl??"Not recorded"}/><Info label="Escalation" value={finding.escalationRequired?(finding.escalationRationale??"Required"):"Not required"}/><Info label="Canonical Action" value={finding.action?`${finding.action.reference} · ${finding.action.closedAt?"Closed":"Open"}`:"Not linked"}/><Info label="Latest re-audit" value={latest?`${latest.outcome.replaceAll("_"," ")} · ${formatDate(latest.reviewDate)}`:"Not recorded"}/></div>{finding.action?<Link href={`/actions/${finding.action.id}`} className="mt-3 inline-block text-sm font-bold text-emerald-800">Open canonical Action →</Link>:finding.actionRequired?<Link href={`/actions/new?sourceType=AUDIT&sourceId=${finding.id}`} className="mt-3 inline-block rounded-lg bg-amber-900 px-3 py-2 text-sm font-bold text-white">Review and create corrective Action</Link>:null}{finding.evidenceLinks.length?<div className="mt-3 flex flex-wrap gap-2">{finding.evidenceLinks.map(link=><Link key={link.id} href={`/evidence/${link.evidence.id}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{link.role.replaceAll("_"," ")} · {link.evidence.title}</Link>)}</div>:null}{finding.reaudits.length?<div className="mt-3 space-y-2">{finding.reaudits.map(review=><div key={review.id} className="rounded-lg border border-slate-200 p-3 text-xs"><strong>{review.outcome.replaceAll("_"," ")} · {formatDate(review.reviewDate)} · {review.reviewer.name}</strong><p className="mt-1">{review.result}</p><p className="mt-1 text-slate-600">Decision: {review.decision}</p></div>)}</div>:null}{canGovern?<AuditFindingControls auditId={id} findingId={finding.id} severity={finding.severity} recommendation={finding.recommendation??""} immediateControl={finding.immediateControl??""} escalationRequired={finding.escalationRequired} escalationRationale={finding.escalationRationale??""} resolved={Boolean(finding.resolvedAt)} evidence={evidence.map(item=>({id:item.id,title:item.title}))}/>:null}</article>})}</div></section> : null}

      <AuditAssessmentForm
        auditId={id}
        sections={audit.template.sections}
        saved={audit.responses.map((item) => ({ questionId: item.questionId, answer: item.answer, comment: item.comment, evidenceId: item.evidenceId, evidenceSourceType: item.evidenceSourceType, evidenceSourceReference: item.evidenceSourceReference }))}
        evidence={evidence}
        summary={{ strengths: audit.strengths ?? "", risks: audit.risks ?? "", recommendations: audit.recommendations ?? "", reviewDate: audit.reviewDate?.toISOString().slice(0, 10) ?? "" }}
        readOnly={!canEdit}
      />
    </main>;
  } finally { await db.$disconnect(); }
}

function Info({label,value}:{label:string;value:string}){return <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm leading-6 capitalize">{value}</p></div>}
function formatDate(value:Date){return new Intl.DateTimeFormat("en-GB",{dateStyle:"medium"}).format(value)}
