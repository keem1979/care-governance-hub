import Link from "next/link";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_PAGE_SIZE,
  activityLabel,
  activityRecordHref,
  parseActivityFilters,
  safeActivityValue,
} from "@/lib/activity";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const filters = parseActivityFilters(await searchParams, context.locations.map((item) => item.id));
  const db = createDb();
  const locationScope = filters.locationId
    ? { locationId: filters.locationId }
    : context.allLocations
      ? {}
      : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] };
  const where = {
    organisationId: context.organisation.id,
    ...locationScope,
    ...(filters.action ? { action: filters.action as never } : {}),
    ...(filters.recordType ? { recordType: filters.recordType } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
    ...(filters.q ? { OR: [
      { summary: { contains: filters.q, mode: "insensitive" as const } },
      { recordType: { contains: filters.q, mode: "insensitive" as const } },
      { recordId: { contains: filters.q, mode: "insensitive" as const } },
      { user: { name: { contains: filters.q, mode: "insensitive" as const } } },
    ] } : {}),
  };

  try {
    const [entries, total, users, types] = await Promise.all([
      db.activityLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } }, location: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * ACTIVITY_PAGE_SIZE,
        take: ACTIVITY_PAGE_SIZE,
      }),
      db.activityLog.count({ where }),
      db.activityLog.findMany({
        where: { organisationId: context.organisation.id, userId: { not: null } },
        distinct: ["userId"],
        select: { userId: true, user: { select: { name: true } } },
        orderBy: { userId: "asc" },
      }),
      db.activityLog.findMany({
        where: { organisationId: context.organisation.id },
        distinct: ["recordType"],
        select: { recordType: true },
        orderBy: { recordType: "asc" },
      }),
    ]);
    const pages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
    const canExport = hasPermission(context.permissions, PERMISSIONS.REPORTS_EXPORT);
    const query = makeQuery(filters);
    return <main className="space-y-7">
      <header>
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <p className="mt-1 text-slate-600">See who changed a record, what changed and when. Entries on this page cannot be edited.</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Matching events" value={total}/>
        <Stat label="Page" value={`${filters.page} of ${pages}`}/>
        <Stat label="Retention" value="Full history"/>
      </section>
      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
        <input name="q" defaultValue={filters.q} placeholder="Search activity or record ID" className={field}/>
        <select name="action" defaultValue={filters.action ?? ""} className={field}><option value="">All actions</option>{ACTIVITY_ACTIONS.map((item) => <option key={item} value={item}>{activityLabel(item)}</option>)}</select>
        <select name="recordType" defaultValue={filters.recordType ?? ""} className={field}><option value="">All record types</option>{types.map(({ recordType }) => <option key={recordType}>{recordType}</option>)}</select>
        <select name="user" defaultValue={filters.userId ?? ""} className={field}><option value="">All users</option>{users.filter((item) => item.user).map((item) => <option key={item.userId!} value={item.userId!}>{item.user!.name}</option>)}</select>
        <select name="location" defaultValue={filters.locationId ?? ""} className={field}><option value="">All authorised locations</option>{context.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input name="from" type="date" defaultValue={filters.from?.toISOString().slice(0, 10)} aria-label="From date" className={field}/>
        <input name="to" type="date" defaultValue={filters.to?.toISOString().slice(0, 10)} aria-label="To date" className={field}/>
        <button className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white">Apply filters</button>
      </form>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Newest activity first</p>
        {canExport ? <a href={`/api/activity/export${query ? `?${query}` : ""}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Export CSV</a> : null}
      </div>
      {entries.length ? <section className="space-y-3">{entries.map((entry) => {
        const sourceHref = activityRecordHref(entry.recordType, entry.recordId);
        return <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex flex-wrap items-center gap-2"><span className={badge(entry.action)}>{activityLabel(entry.action)}</span><span className="text-xs font-semibold text-slate-500">{entry.recordType}{entry.recordId ? ` · ${entry.recordId}` : ""}</span></div><h2 className="mt-2 font-bold">{entry.summary}</h2></div>
          <time className="text-xs text-slate-500" dateTime={entry.createdAt.toISOString()}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(entry.createdAt)}</time>
        </div>
        <p className="mt-3 text-sm text-slate-600">{entry.user?.name ?? "System"} · {entry.location?.name ?? "Organisation-wide"}{entry.sessionInfo ? " · Session information recorded" : ""}</p>
        {sourceHref ? <Link href={sourceHref} className="mt-3 inline-flex text-sm font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-2">Open source record</Link> : null}
        {entry.beforeValue || entry.afterValue ? <details className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-semibold">Inspect recorded changes</summary><div className="mt-3 grid gap-3 lg:grid-cols-2">{entry.beforeValue ? <Value title="Before" value={entry.beforeValue}/> : null}{entry.afterValue ? <Value title="After" value={entry.afterValue}/> : null}</div></details> : null}
      </article>;
      })}</section> : <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-bold">No activity found</h2><p className="mt-1 text-sm text-slate-600">Adjust the filters to view other recorded events.</p></section>}
      <nav className="flex items-center justify-between" aria-label="Activity pages">
        {filters.page > 1 ? <Link href={`?${makeQuery({ ...filters, page: filters.page - 1 })}`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold">Previous</Link> : <span/>}
        {filters.page < pages ? <Link href={`?${makeQuery({ ...filters, page: filters.page + 1 })}`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold">Next</Link> : <span/>}
      </nav>
    </main>;
  } finally {
    await db.$disconnect();
  }
}

function Value({ title, value }: { title: string; value: unknown }) {
  return <div><h3 className="text-xs font-bold uppercase text-slate-500">{title}</h3><pre className="mt-1 overflow-auto whitespace-pre-wrap break-all rounded-lg border bg-white p-3 text-xs">{JSON.stringify(safeActivityValue(value), null, 2)}</pre></div>;
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>; }
function badge(action: string) { return `rounded-full px-2.5 py-1 text-xs font-bold ${["ARCHIVE","LOGIN_FAILED"].includes(action) ? "bg-red-100 text-red-800" : ["CREATE","RESTORE","APPROVAL"].includes(action) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`; }
function makeQuery(filters: ReturnType<typeof parseActivityFilters>) { const params = new URLSearchParams(); if (filters.q) params.set("q", filters.q); if (filters.action) params.set("action", filters.action); if (filters.recordType) params.set("recordType", filters.recordType); if (filters.userId) params.set("user", filters.userId); if (filters.locationId) params.set("location", filters.locationId); if (filters.from) params.set("from", filters.from.toISOString().slice(0,10)); if (filters.to) params.set("to", filters.to.toISOString().slice(0,10)); if (filters.page > 1) params.set("page", String(filters.page)); return params.toString(); }
const field = "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";
