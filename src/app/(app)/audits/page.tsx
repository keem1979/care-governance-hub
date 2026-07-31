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
  const db = createDb();
  try {
    const [audits, templates] = await Promise.all([
      db.audit.findMany({
        where: { ...auditScopeWhere(context), ...(status ? { status: status as never } : {}), ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
        include: { template: { select: { name: true, sections: { select: { _count: { select: { questions: true } } } } } }, auditor: { select: { name: true } }, location: { select: { name: true } }, responses: { select: { answer: true } }, _count: { select: { findings: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      db.auditTemplate.findMany({
        where: { isPublished: true, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] },
        include: { sections: { select: { _count: { select: { questions: true } } } }, _count: { select: { audits: true } } },
        orderBy: { name: "asc" },
      }),
    ]);
    const inProgress = audits.filter((item) => ["DRAFT", "IN_PROGRESS"].includes(item.status)).length;
    const awaiting = audits.filter((item) => item.status === "AWAITING_REVIEW").length;
    const completed = audits.filter((item) => ["COMPLETED", "CLOSED"].includes(item.status)).length;
    return <main className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Assurance programme</p><h1 className="text-3xl font-bold">Audit Centre</h1><p className="mt-1 text-slate-600">Choose an audit form, check a sample, record findings and submit it for sign-off.</p></div>{canComplete ? <Link href="/audits/new" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Start a new audit form</Link> : null}</div>

      {canComplete ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold text-emerald-950">How to add an audit</h2><p className="mt-1 text-sm text-emerald-900">1. Choose a form below. 2. Add the location, date and scope. 3. Complete every question and save or submit.</p></div><Link href="/audits/new" className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">Choose an audit form</Link></div></section> : null}

      <section className="grid gap-3 sm:grid-cols-3">{[["In progress", inProgress], ["Awaiting review", awaiting], ["Completed or closed", completed]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>)}</section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Audit work</p><h2 className="text-2xl font-bold">Your audits</h2></div><form className="flex flex-wrap gap-2"><input name="q" defaultValue={q} placeholder="Search audits" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><select name="status" defaultValue={status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option>{["DRAFT", "IN_PROGRESS", "AWAITING_REVIEW", "COMPLETED", "CLOSED", "ARCHIVED"].map((value) => <option key={value} value={value}>{auditStatusLabel(value)}</option>)}</select><button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Filter</button></form></div>
        {!audits.length ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h3 className="font-bold">No audits found</h3><p className="mt-1 text-sm text-slate-600">Choose one of the audit forms below to create the first record.</p></div> : <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Audit</th><th className="p-4">Location</th><th className="p-4">Form progress</th><th className="p-4">Score</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead><tbody>{audits.map((audit) => {
          const questionCount = audit.template.sections.reduce((sum, section) => sum + section._count.questions, 0);
          const answered = audit.responses.filter((response) => response.answer).length;
          return <tr key={audit.id} className="border-t border-slate-200"><td className="p-4"><Link href={`/audits/${audit.id}#audit-form`} className="font-semibold text-emerald-800">{audit.title}</Link><p className="text-xs text-slate-500">{audit.template.name} · {formatDate(audit.auditDate)}</p></td><td className="p-4">{audit.location.name}</td><td className="p-4"><span className="font-semibold">{answered}/{questionCount}</span><span className="ml-1 text-xs text-slate-500">answered</span></td><td className="p-4 font-semibold">{audit.overallScore === null ? "—" : `${audit.overallScore}%`}</td><td className="p-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{auditStatusLabel(audit.status)}</span></td><td className="p-4 text-right"><Link href={`/audits/${audit.id}#audit-form`} className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-800">{["COMPLETED", "CLOSED", "ARCHIVED"].includes(audit.status) ? "View form" : "Complete form"}</Link></td></tr>;
        })}</tbody></table></div>}
      </section>

      <section><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Form library</p><h2 className="text-2xl font-bold">Choose an audit form</h2><p className="mt-1 text-sm text-slate-600">Each form now includes core governance checks and questions tailored to that audit area.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{templates.map((template) => {
        const questionCount = template.sections.reduce((sum, section) => sum + section._count.questions, 0);
        return <article key={template.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{template.name}</h3><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">v{template.version}</span></div><p className="mt-2 text-sm text-slate-600">{template.description}</p><p className="mt-4 text-xs font-semibold text-slate-500">{questionCount} questions · {template.sections.length} sections · {template._count.audits} audit records</p>{canComplete ? <Link href={`/audits/new?template=${template.id}`} className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Open this audit form</Link> : null}</article>;
      })}</div></section>
    </main>;
  } finally { await db.$disconnect(); }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value);
}
