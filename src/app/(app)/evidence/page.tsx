import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { EVIDENCE_CATEGORIES, evidenceDisplayStatus, evidenceScopeWhere } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function EvidencePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireAuthorisedContext();
  const canViewAll = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW);
  const canUpload = hasPermission(context.permissions, PERMISSIONS.EVIDENCE_UPLOAD);
  if (!canViewAll && !canUpload) redirect("/forbidden");
  const params = await searchParams; const q = String(params.q ?? "").trim(); const category = String(params.category ?? ""); const status = String(params.status ?? ""); const locationId = String(params.location ?? ""); const view = params.view === "folders" ? "folders" : "cards";
  const db = createDb();
  const items = await db.evidence.findMany({
    where: {
      AND: [
        evidenceScopeWhere(context),
        ...(!canViewAll ? [{ OR: [{ ownerId: context.user.id }, { uploadedById: context.user.id }] }] : []),
        ...(q ? [{ OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }, { tags: { has: q } }] }] : []),
      ],
      ...(category ? { category } : {}), ...(status ? { status: status as "ACTIVE" | "ARCHIVED" } : {}), ...(locationId ? { locationId } : {}),
    },
    include: { owner: { select: { name: true } }, location: { select: { name: true } }, currentVersion: { select: { versionNumber: true, fileName: true } } },
    orderBy: [{ archivedAt: "asc" }, { reviewExpiryDate: "asc" }, { title: "asc" }],
  }).finally(() => db.$disconnect());
  const expiring = items.filter((item) => evidenceDisplayStatus(item.status, item.reviewExpiryDate) === "Expiring soon").length;
  const expired = items.filter((item) => evidenceDisplayStatus(item.status, item.reviewExpiryDate) === "Expired").length;
  const grouped = EVIDENCE_CATEGORIES.map((categoryName) => ({ category: categoryName, items: items.filter((item) => item.category === categoryName) })).filter((group) => group.items.length);
  return <main className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Assurance repository</p><h1 className="text-3xl font-bold">Evidence Library</h1><p className="mt-1 text-slate-600">Uploaded documents and live system records, with clear provenance and controlled access.</p></div><div className="flex flex-wrap gap-2"><Link href="/evidence/requirements" className="rounded-xl border border-emerald-700 bg-white px-5 py-3 text-sm font-semibold text-emerald-800">Required evidence and gaps</Link>{canUpload && <Link href="/evidence/new" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Upload evidence</Link>}</div></div>
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-emerald-950">Know exactly what evidence is missing</h2><p className="mt-1 text-sm text-emerald-900">Use the Evidence Requirements Register to see the complete homecare baseline, current files, expired items and gaps—with an upload button against every requirement.</p></div><Link href="/evidence/requirements?status=NEEDS_EVIDENCE" className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-bold text-white">Review evidence gaps</Link></div></section>
    <section className="grid gap-3 sm:grid-cols-3">{[["Evidence items",items.length],["Expiring within 30 days",expiring],["Expired",expired]].map(([label,value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>)}</section>
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
      <input name="q" defaultValue={q} placeholder="Search title, description or exact tag" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
      <select name="category" defaultValue={category} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All categories</option>{EVIDENCE_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
      <select name="location" defaultValue={locationId} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All locations</option>{context.locations.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select>
      <select name="status" defaultValue={status} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Active and archived</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select>
      <button className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white">Filter</button>
      <input type="hidden" name="view" value={view} />
    </form>
    <div className="flex items-center justify-between"><p className="text-sm text-slate-600">{items.length} evidence {items.length === 1 ? "item" : "items"}</p><div className="flex gap-2"><Link href="/evidence?view=cards" className={`rounded-lg px-3 py-2 text-sm ${view === "cards" ? "bg-emerald-100 font-semibold" : "bg-white"}`}>Cards</Link><Link href="/evidence?view=folders" className={`rounded-lg px-3 py-2 text-sm ${view === "folders" ? "bg-emerald-100 font-semibold" : "bg-white"}`}>Folders</Link>{hasPermission(context.permissions, PERMISSIONS.REPORTS_EXPORT) && <Link href="/api/evidence/export" className="rounded-lg bg-white px-3 py-2 text-sm">Export index</Link>}</div></div>
    {!items.length ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-bold">No evidence found</h2><p className="mt-2 text-slate-600">Upload evidence or adjust the filters.</p></section> :
      view === "cards" ? <section className="grid gap-4 lg:grid-cols-2">{items.map((item) => <EvidenceCard key={item.id} item={item} />)}</section> :
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{grouped.map((group) => <div key={group.category} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold">{group.category}</h2><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold">{group.items.length}</span></div><div className="mt-4 space-y-2">{group.items.slice(0,6).map((item) => <Link key={item.id} href={`/evidence/${item.id}`} className="block rounded-lg bg-slate-50 p-3 text-sm font-medium hover:bg-emerald-50">{item.title}<span className="block text-xs font-normal text-slate-500">{item.currentVersion?.fileName}</span></Link>)}</div></div>)}</section>}
  </main>;
}

function formatDate(date: Date | null) { return date ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date) : "Not set"; }
function Badge({ value }: { value: string }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${value === "Expired" ? "bg-red-100 text-red-800" : value === "Current" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{value}</span>; }
function EvidenceCard({ item }: { item: { id:string; title:string; category:string; evidenceType:string; confidentiality:string; status:string; reviewExpiryDate:Date|null; owner:{name:string}; location:{name:string}|null; currentVersion:{versionNumber:string;fileName:string}|null; tags:string[]; relatedModule:string|null; generatedPolicyId:string|null } }) {
  const display = evidenceDisplayStatus(item.status,item.reviewExpiryDate);
  const systemRecord = Boolean(item.generatedPolicyId) || item.relatedModule === "RegisterEntry";
  const sourceLabel = item.generatedPolicyId ? "Linked live policy · one controlled copy" : "Live system record · synced automatically";
  return <Link href={`/evidence/${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{item.category} · {item.evidenceType}</p><h2 className="mt-1 text-lg font-bold">{item.title}</h2><p className="mt-1 text-xs font-medium text-slate-500">{systemRecord ? sourceLabel : item.currentVersion?.fileName}</p></div><Badge value={display} /></div><dl className="mt-5 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-slate-500">Owner</dt><dd className="font-medium">{item.owner.name}</dd></div><div><dt className="text-slate-500">Location</dt><dd className="font-medium">{item.location?.name ?? "Organisation"}</dd></div><div><dt className="text-slate-500">Expiry/review</dt><dd className="font-medium">{systemRecord ? item.generatedPolicyId ? formatDate(item.reviewExpiryDate) : "Live" : formatDate(item.reviewExpiryDate)}</dd></div></dl><p className="mt-4 text-xs font-semibold capitalize text-slate-500">{item.confidentiality.toLowerCase()}</p></Link>;
}
