import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { auditScopeWhere, auditStatusLabel } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function AuditsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireAuthorisedContext();
  const canComplete = hasPermission(context.permissions, PERMISSIONS.AUDITS_COMPLETE);
  const canView = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW);
  if (!canComplete && !canView) redirect("/forbidden");
  const params = await searchParams;
  const status = String(params.status ?? "");
  const q = String(params.q ?? "").trim();
  const category = String(params.category ?? "");
  const db = createDb();
  try {
    const [audits, templates] = await Promise.all([
      db.audit.findMany({
        where: { ...auditScopeWhere(context), ...(status ? { status: status as never } : {}), ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
        include: { template: { select: { name: true, sections: { select: { _count: { select: { questions: true } } } } } }, auditor: { select: { name: true } }, location: { select: { name: true } }, responses: { select: { answer: true } }, findings: { where: { resolvedAt: null }, select: { severity: true } }, _count: { select: { findings: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      db.auditTemplate.findMany({
        where: { isPublished: true, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] },
        include: { sections: { select: { _count: { select: { questions: true } } } }, _count: { select: { audits: true } } },
        orderBy: [{category:"asc"},{ name: "asc" }],
      }),
    ]);
    const inProgress = audits.filter((item) => ["DRAFT", "IN_PROGRESS"].includes(item.status)).length;
    const awaiting = audits.filter((item) => item.status === "AWAITING_REVIEW").length;
    const completed = audits.filter((item) => ["COMPLETED", "CLOSED"].includes(item.status)).length;
    const currentWork = audits.filter((item) => !["CLOSED", "ARCHIVED"].includes(item.status)).sort((left, right) => Number(right.findings.some((finding) => finding.severity === "CRITICAL")) - Number(left.findings.some((finding) => finding.severity === "CRITICAL"))).slice(0, 5);
    const shownTemplates=category?templates.filter((item)=>item.category===category):templates;
    return <main className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Audit work</p><h1 className="mt-1 text-3xl font-bold">Audit Centre</h1><p className="mt-1 text-slate-600">See what needs attention, record checks and Evidence, then follow findings through Actions and assurance.</p></div>{canComplete ? <Link href="/audits/new" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Start an audit</Link> : null}</div>

      <section aria-label="Current audit work" className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-800">Needs attention</p><h2 className="mt-1 text-xl font-bold">Current audit work</h2><p className="mt-1 text-sm text-amber-950">Open the next task; scores and full history remain below.</p></div>{currentWork.length?<ul className="mt-4 space-y-2">{currentWork.map((audit)=>{const critical=audit.findings.some((finding)=>finding.severity==="CRITICAL"),label=critical?"Review Critical finding":audit.status==="DRAFT"||audit.status==="IN_PROGRESS"?"Continue audit form":audit.status==="AWAITING_REVIEW"?"Review fieldwork and findings":"Review assurance conditions",target=critical?"#audit-findings":audit.status==="DRAFT"||audit.status==="IN_PROGRESS"?"#audit-form":"#audit-current-work";return <li key={audit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white p-3"><div><strong className="text-sm">{audit.title}</strong><p className="mt-0.5 text-xs text-slate-600">{audit.location.name} · {auditStatusLabel(audit.status)}{critical?" · Critical finding needs attention":audit.findings.length?` · ${audit.findings.length} open finding(s)`:""}</p></div><Link href={`/audits/${audit.id}${target}`} className="rounded-lg border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-900">{label}</Link></li>})}</ul>:<p className="mt-3 text-sm text-amber-950">No open audit tasks in this view.</p>}</section>

      <section className="grid gap-3 sm:grid-cols-3">{[["In progress", inProgress], ["Awaiting review", awaiting], ["Completed or closed", completed]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>)}</section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Audit work</p><h2 className="text-2xl font-bold">Your audits</h2></div><form className="flex flex-wrap gap-2"><input aria-label="Search audits" name="q" defaultValue={q} placeholder="Search audits" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><select aria-label="Filter audit status" name="status" defaultValue={status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option>{["DRAFT", "IN_PROGRESS", "AWAITING_REVIEW", "COMPLETED", "CLOSED", "ARCHIVED"].map((value) => <option key={value} value={value}>{auditStatusLabel(value)}</option>)}</select><button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Filter</button></form></div>
        {!audits.length ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h3 className="font-bold">No audits found</h3><p className="mt-1 text-sm text-slate-600">Choose one of the audit forms below to create the first record.</p></div> : <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Audit</th><th className="p-4">Location</th><th className="p-4">Form progress</th><th className="p-4">Score</th><th className="p-4">Status</th><th className="p-4"><span className="sr-only">Next action</span></th></tr></thead><tbody>{audits.map((audit) => {
          const questionCount = audit.template.sections.reduce((sum, section) => sum + section._count.questions, 0);
          const answered = audit.responses.filter((response) => response.answer).length;
          return <tr key={audit.id} className="border-t border-slate-200"><td className="p-4"><Link href={`/audits/${audit.id}#audit-form`} className="font-semibold text-emerald-800">{audit.title}</Link><p className="text-xs text-slate-500">{audit.template.name} · {formatDate(audit.auditDate)}</p></td><td className="p-4">{audit.location.name}</td><td className="p-4"><span className="font-semibold">{answered}/{questionCount}</span><span className="ml-1 text-xs text-slate-500">answered</span></td><td className="p-4 font-semibold">{audit.overallScore === null ? "—" : `${audit.overallScore}%`}</td><td className="p-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{auditStatusLabel(audit.status)}</span></td><td className="p-4 text-right"><Link href={`/audits/${audit.id}#audit-form`} className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-800">{["COMPLETED", "CLOSED", "ARCHIVED"].includes(audit.status) ? "View form" : "Complete form"}</Link></td></tr>;
        })}</tbody></table></div>}
      </section>

      <section><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">Choose an audit form</h2><p className="mt-1 text-sm text-slate-600">Forms cover care delivery, people’s experience, workforce, safety, clinical practice, information governance and leadership.</p></div><form><select aria-label="Filter audit area" name="category" defaultValue={category} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All audit areas</option>{[...new Set(templates.map((item)=>item.category))].map((item)=><option key={item}>{item}</option>)}</select><button className="ml-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Show</button></form></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{shownTemplates.map((template) => {
        const questionCount = template.sections.reduce((sum, section) => sum + section._count.questions, 0);
        return <article key={template.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{template.category}</p><h3 className="mt-1 font-bold">{template.name}</h3></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">v{template.version}</span></div><p className="mt-2 text-sm text-slate-600">{template.description}</p><div className="mt-3 flex flex-wrap gap-1">{template.standardRefs.slice(0,3).map((item)=><span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{item}</span>)}</div><p className="mt-4 text-xs font-semibold text-slate-500">{questionCount} checks · {template.sections.length} sections · {template.frequency??"Risk-based"}{template.serviceSpecific?" · when applicable":""}</p>{canComplete ? <Link href={`/audits/new?template=${template.id}`} className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Open this audit form</Link> : null}</article>;
      })}</div></section>
    </main>;
  } finally { await db.$disconnect(); }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value);
}
