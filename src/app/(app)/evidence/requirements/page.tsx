import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { EVIDENCE_REQUIREMENTS, evidenceRequirementStatus } from "@/lib/evidence-requirements";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

type Query = Record<string, string | string[] | undefined>;
const QUESTIONS = ["SAFE", "EFFECTIVE", "CARING", "RESPONSIVE", "WELL_LED"] as const;
const STATUSES = ["NEEDS_EVIDENCE", "EXPIRED", "REVIEW_SOON", "CURRENT"] as const;

export default async function EvidenceRequirementsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const context = await requireAuthorisedContext();
  const canView = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW);
  const canUpload = hasPermission(context.permissions, PERMISSIONS.EVIDENCE_UPLOAD);
  if (!canView && !canUpload) redirect("/forbidden");
  const query = await searchParams;
  const q = String(query.q ?? "").trim().toLowerCase();
  const question = QUESTIONS.includes(String(query.question) as never) ? String(query.question) : "";
  const requestedStatus = STATUSES.includes(String(query.status) as never) ? String(query.status) : "";
  const serviceSpecific = String(query.scope ?? "all");
  const db = createDb();
  const evidence = await db.evidence.findMany({
    where: { ...evidenceScopeWhere(context), status: "ACTIVE", relatedModule: "EvidenceRequirement" },
    select: { id: true, title: true, relatedRecordId: true, reviewExpiryDate: true, location: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  }).finally(() => db.$disconnect());
  const rows = EVIDENCE_REQUIREMENTS.map((requirement) => {
    const linked = evidence.filter((item) => item.relatedRecordId === requirement.key);
    return { requirement, linked, status: evidenceRequirementStatus(linked) };
  });
  const counts = Object.fromEntries(STATUSES.map((status) => [status, rows.filter((item) => item.status === status).length]));
  const filtered = rows.filter(({ requirement, status }) =>
    (!q || `${requirement.title} ${requirement.description} ${requirement.category} ${requirement.qualityStatement} ${requirement.regulations.join(" ")}`.toLowerCase().includes(q)) &&
    (!question || requirement.keyQuestion === question) &&
    (!requestedStatus || status === requestedStatus) &&
    (serviceSpecific !== "core" || !requirement.serviceSpecific),
  );
  return <main className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Registered Manager evidence workspace</p><h1 className="text-3xl font-bold">Evidence Requirements Register</h1><p className="mt-1 max-w-4xl text-slate-600">A sourced homecare baseline showing what evidence is present, what needs review and where a gap remains.</p></div><div className="flex flex-wrap gap-2"><Link href="/evidence" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">Evidence Library</Link>{canUpload ? <Link href="/evidence/new" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">General upload</Link> : null}</div></header>
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Important:</strong> CQC states that sector evidence categories are a guide, not a universal checklist. This register is a comprehensive domiciliary-care baseline. The Registered Manager must tailor service-specific items to the regulated activities, people supported, contracts and local safeguarding arrangements.</section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Needs evidence" value={counts.NEEDS_EVIDENCE} tone="red" /><Stat label="Expired evidence" value={counts.EXPIRED} tone="red" /><Stat label="Review within 30 days" value={counts.REVIEW_SOON} tone="amber" /><Stat label="Current evidence" value={counts.CURRENT} tone="green" /></section>
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
      <input name="q" defaultValue={String(query.q ?? "")} placeholder="Search requirement, regulation or evidence type" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
      <select name="question" defaultValue={question} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All key questions</option>{QUESTIONS.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
      <select name="status" defaultValue={requestedStatus} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All evidence states</option>{STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select>
      <select name="scope" defaultValue={serviceSpecific} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="all">Core and service-specific</option><option value="core">Core baseline only</option></select>
      <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Apply filters</button>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Showing {filtered.length} of {rows.length} evidence requirements</p><Link href="/inspection" className="text-sm font-semibold text-emerald-800">Open Inspection Centre →</Link></div>
    {!filtered.length ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-bold">No matching requirements</h2><p className="mt-1 text-sm text-slate-600">Adjust the filters to see more of the evidence baseline.</p></section> :
      <section className="space-y-7">{QUESTIONS.map((keyQuestion) => {
        const items = filtered.filter(({ requirement }) => requirement.keyQuestion === keyQuestion);
        if (!items.length) return null;
        return <section key={keyQuestion}><div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2"><h2 className="text-xl font-bold">{label(keyQuestion)}</h2><span className="text-sm text-slate-500">{items.length} requirements</span></div><div className="space-y-3">{items.map(({ requirement, linked, status }) => <article key={requirement.key} className={`rounded-2xl border bg-white p-5 shadow-sm ${status === "NEEDS_EVIDENCE" || status === "EXPIRED" ? "border-red-300" : status === "REVIEW_SOON" ? "border-amber-300" : "border-emerald-200"}`}>
          <div className="grid gap-4 xl:grid-cols-[1fr_220px] xl:items-start"><div><div className="flex flex-wrap items-center gap-2"><Status value={status} />{requirement.serviceSpecific ? <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">WHEN APPLICABLE</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">CORE BASELINE</span>}<span className="text-xs font-semibold text-slate-500">{requirement.category}</span></div><h3 className="mt-2 text-lg font-bold">{requirement.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{requirement.description}</p><div className="mt-3 grid gap-3 text-sm md:grid-cols-2"><p><strong>Quality statement:</strong> {requirement.qualityStatement}</p><p><strong>Review frequency:</strong> {requirement.frequency}</p><p><strong>Regulatory basis:</strong> {requirement.regulations.join(" · ")}</p><p><a href={requirement.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-800 underline">Open official source ↗</a></p></div><details className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-semibold">Examples of suitable evidence</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{requirement.examples.map((item) => <li key={item}>{item}</li>)}</ul></details>{linked.length ? <div className="mt-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Linked evidence</p><div className="mt-1 flex flex-wrap gap-2">{linked.map((item) => <Link key={item.id} href={`/evidence/${item.id}`} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{item.title}{item.location ? ` · ${item.location.name}` : ""}</Link>)}</div></div> : <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">Evidence gap: nothing is linked to this requirement.</p>}</div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-bold">{status === "CURRENT" ? "Evidence is current" : statusLabel(status)}</p><p className="mt-1 text-xs leading-5 text-slate-600">{status === "CURRENT" ? "Add another file when evidence changes or a new period closes." : "Upload the source record and set its evidence and review dates."}</p>{canUpload ? <Link href={`/evidence/new?requirement=${encodeURIComponent(requirement.key)}`} className={`mt-4 inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-bold ${status === "CURRENT" ? "border border-emerald-700 bg-white text-emerald-800" : "bg-emerald-700 text-white"}`}>{status === "CURRENT" ? "Add updated evidence" : "Upload evidence"}</Link> : <p className="mt-4 text-xs font-semibold text-slate-500">Upload permission required</p>}</div></div>
        </article>)}</div></section>;
      })}</section>}
  </main>;
}

function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()); }
function statusLabel(value: string) { return value === "NEEDS_EVIDENCE" ? "Needs evidence" : value === "REVIEW_SOON" ? "Review within 30 days" : label(value); }
function Status({ value }: { value: string }) { const classes = value === "CURRENT" ? "bg-emerald-100 text-emerald-800" : value === "REVIEW_SOON" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800"; return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${classes}`}>{statusLabel(value).toUpperCase()}</span>; }
function Stat({ label: title, value, tone }: { label: string; value: number; tone: "red" | "amber" | "green" }) { const classes = tone === "red" ? "border-red-200 bg-red-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"; return <div className={`rounded-2xl border p-5 ${classes}`}><p className="text-sm text-slate-600">{title}</p><p className="mt-1 text-3xl font-black">{value}</p></div>; }
