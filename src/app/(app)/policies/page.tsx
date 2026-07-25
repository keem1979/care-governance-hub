import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { policyDisplayStatus, POLICY_CATEGORIES } from "@/lib/policies";

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const params = await searchParams;
  const q = String(params.q ?? "").trim();
  const category = String(params.category ?? "");
  const status = String(params.status ?? "");
  const view = params.view === "table" ? "table" : "cards";
  const db = createDb();
  const policies = await db.policy.findMany({
    where: {
      organisationId: context.organisation.id,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { tags: { has: q } }] } : {}),
      ...(category ? { category } : {}),
      ...(status ? { status: status as "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "ARCHIVED" } : {}),
    },
    include: { owner: { select: { name: true } }, currentVersion: { select: { versionNumber: true } } },
    orderBy: [{ archivedAt: "asc" }, { nextReviewDate: "asc" }, { title: "asc" }],
  }).finally(() => db.$disconnect());
  const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
  const overdue = policies.filter((p) => policyDisplayStatus(p.status, p.nextReviewDate) === "Overdue").length;
  const due = policies.filter((p) => policyDisplayStatus(p.status, p.nextReviewDate) === "Due for review").length;
  return <main className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Governance records</p><h1 className="text-3xl font-bold">Policy Library</h1><p className="mt-1 text-slate-600">Controlled policies, review dates, approvals and version history.</p></div>
      {canEdit && <Link href="/policies/new" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Add policy</Link>}
    </div>
    <section className="grid gap-3 sm:grid-cols-3">
      {[["Total policies", policies.length], ["Due within 30 days", due], ["Overdue", overdue]].map(([label, value]) =>
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>)}
    </section>
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[2fr_1fr_1fr_auto]">
      <input name="q" defaultValue={q} placeholder="Search policy title or exact tag" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
      <select name="category" defaultValue={category} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All categories</option>{POLICY_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
      <select name="status" defaultValue={status} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All workflow states</option><option value="DRAFT">Draft</option><option value="UNDER_REVIEW">Under review</option><option value="APPROVED">Approved</option><option value="ARCHIVED">Archived</option></select>
      <button className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white">Filter</button>
      <input type="hidden" name="view" value={view} />
    </form>
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600">{policies.length} {policies.length === 1 ? "policy" : "policies"}</p>
      <div className="flex gap-2"><Link href="/policies?view=cards" className={`rounded-lg px-3 py-2 text-sm ${view === "cards" ? "bg-emerald-100 font-semibold" : "bg-white"}`}>Cards</Link><Link href="/policies?view=table" className={`rounded-lg px-3 py-2 text-sm ${view === "table" ? "bg-emerald-100 font-semibold" : "bg-white"}`}>Table</Link><Link href="/api/policies/export" className="rounded-lg bg-white px-3 py-2 text-sm">Export CSV</Link></div>
    </div>
    {policies.length === 0 ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-bold">No policies found</h2><p className="mt-2 text-slate-600">Add the first controlled policy or adjust the filters.</p></section> :
      view === "cards" ? <section className="grid gap-4 lg:grid-cols-2">{policies.map((policy) => <PolicyCard key={policy.id} policy={policy} />)}</section> :
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Policy</th><th className="p-4">Owner</th><th className="p-4">Version</th><th className="p-4">Next review</th><th className="p-4">Status</th></tr></thead><tbody>{policies.map((policy) => <tr key={policy.id} className="border-t border-slate-200"><td className="p-4"><Link className="font-semibold text-emerald-800" href={`/policies/${policy.id}`}>{policy.title}</Link><div className="text-slate-500">{policy.category}</div></td><td className="p-4">{policy.owner.name}</td><td className="p-4">{policy.currentVersion?.versionNumber ?? "—"}</td><td className="p-4">{formatDate(policy.nextReviewDate)}</td><td className="p-4"><Status value={policyDisplayStatus(policy.status, policy.nextReviewDate)} /></td></tr>)}</tbody></table></div>}
  </main>;
}

function formatDate(date: Date | null) { return date ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date) : "Not set"; }
function Status({ value }: { value: string }) { const alert = value === "Overdue"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${alert ? "bg-red-100 text-red-800" : value === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{value}</span>; }
function PolicyCard({ policy }: { policy: { id: string; title: string; category: string; status: string; nextReviewDate: Date | null; owner: { name: string }; currentVersion: { versionNumber: string } | null; tags: string[] } }) {
  const display = policyDisplayStatus(policy.status, policy.nextReviewDate);
  return <Link href={`/policies/${policy.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{policy.category}</p><h2 className="mt-1 text-lg font-bold">{policy.title}</h2></div><Status value={display} /></div>
    <dl className="mt-5 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-slate-500">Owner</dt><dd className="font-medium">{policy.owner.name}</dd></div><div><dt className="text-slate-500">Version</dt><dd className="font-medium">{policy.currentVersion?.versionNumber ?? "—"}</dd></div><div><dt className="text-slate-500">Next review</dt><dd className="font-medium">{formatDate(policy.nextReviewDate)}</dd></div></dl>
    {policy.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1">{policy.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{tag}</span>)}</div>}
  </Link>;
}
