import Link from "next/link";
import { KpiCsvImport } from "@/components/kpi-entry-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { addMonths, kpiLabel, monthKey, ragClasses } from "@/lib/kpis";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

type Query = Record<string, string | string[] | undefined>;

export default async function KpiDashboardPage({ searchParams }: { searchParams: Promise<Query> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const query = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(String(query.month)) ? String(query.month) : monthKey(new Date());
  const reportingMonth = new Date(`${month}-01T12:00:00Z`);
  const requestedLocation = String(query.location ?? "organisation");
  const locationId = requestedLocation === "organisation" ? null : context.locations.some((item) => item.id === requestedLocation) ? requestedLocation : null;
  const db = createDb();
  try {
    const definitions = await db.kpiDefinition.findMany({ where: { organisationId: context.organisation.id, isActive: true }, orderBy: { sortOrder: "asc" } });
    const selectedKpiId = definitions.some((item) => item.id === String(query.kpi)) ? String(query.kpi) : definitions[0]?.id ?? "";
    const trendStart = addMonths(reportingMonth, -11);
    const [monthEntries, trendEntries] = await Promise.all([
      db.kpiEntry.findMany({ where: { organisationId: context.organisation.id, reportingMonth, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }) }, include: { location: { select: { name: true } }, _count: { select: { evidenceLinks: true } } } }),
      selectedKpiId ? db.kpiEntry.findMany({ where: { organisationId: context.organisation.id, kpiId: selectedKpiId, reportingMonth: { gte: trendStart, lte: reportingMonth }, locationId }, orderBy: { reportingMonth: "asc" } }) : [],
    ]);
    const visible = definitions.map((definition) => ({ definition, entry: monthEntries.find((entry) => entry.kpiId === definition.id && entry.locationId === locationId) }));
    const counts = { GREEN: 0, AMBER: 0, RED: 0, NONE: 0 };
    for (const item of visible) {
      if (item.entry) counts[item.entry.ragStatus]++;
      else counts.NONE++;
    }
    const selected = definitions.find((item) => item.id === selectedKpiId);
    const comparison = monthEntries.filter((item) => item.kpiId === selectedKpiId);
    const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
    const previous = monthKey(addMonths(reportingMonth, -1)), next = monthKey(addMonths(reportingMonth, 1));
    return <main className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Monthly performance</p><h1 className="text-3xl font-bold">KPI Dashboard</h1><p className="mt-1 text-slate-600">Targets, RAG status, evidence and trends across care quality and operations.</p></div><div className="flex flex-wrap gap-2">{canEdit ? <Link href={`/kpis/entry?month=${month}`} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Enter KPI</Link> : null}<Link href={`/api/kpis/export?month=${month}${locationId ? `&location=${locationId}` : ""}`} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">Export CSV</Link><Link href={`/kpis/report?month=${month}&location=${requestedLocation}`} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">PDF / Print</Link></div></header>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex gap-2"><Link href={href(query, { month: previous })} className="rounded-lg border px-3 py-2 text-sm">Previous</Link><input form="kpi-filters" type="month" name="month" defaultValue={month} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><Link href={href(query, { month: next })} className="rounded-lg border px-3 py-2 text-sm">Next</Link></div><form id="kpi-filters" className="flex flex-wrap gap-2"><select name="location" defaultValue={requestedLocation} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="organisation">Organisation-wide</option>{context.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="kpi" defaultValue={selectedKpiId} className="max-w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm">{definitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">View</button></form></section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Green" value={counts.GREEN} tone="green" /><Stat label="Amber" value={counts.AMBER} tone="amber" /><Stat label="Red" value={counts.RED} tone="red" /><Stat label="No data recorded" value={counts.NONE} tone="slate" /></section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">{selected?.name ?? "KPI"} trend</h2><p className="text-sm text-slate-600">Twelve months ending {month}</p></div><span className="text-sm font-semibold text-slate-500">{selected?.unit}</span></div><Trend entries={trendEntries} start={trendStart} end={reportingMonth} /></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Location comparison</h2><p className="text-sm text-slate-600">{selected?.name} in {month}</p><div className="mt-5 space-y-3">{comparison.length ? comparison.map((item) => <div key={item.id}><div className="flex justify-between text-sm"><span>{item.location?.name ?? "Organisation-wide"}</span><span className="font-bold">{item.actualValue} {selected?.unit}</span></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${item.ragStatus === "GREEN" ? "bg-emerald-600" : item.ragStatus === "AMBER" ? "bg-amber-500" : "bg-red-600"}`} style={{ width: `${comparisonWidth(item.actualValue, comparison.map((entry) => entry.actualValue))}%` }} /></div></div>) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No data recorded.</p>}</div></div>
      </section>

      <section><div className="mb-4"><h2 className="text-xl font-bold">KPI scorecard</h2><p className="text-sm text-slate-600">{visible.length} standard indicators for {month}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(({ definition, entry }) => <article key={definition.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{definition.name}</h3><p className="mt-1 text-xs text-slate-500">{kpiLabel(definition.direction)} · {definition.unit}</p></div>{entry ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ragClasses(entry.ragStatus)}`}>{entry.ragStatus}</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">NO DATA</span>}</div>{entry ? <><p className="mt-5 text-3xl font-black">{entry.actualValue}<span className="ml-1 text-sm font-medium text-slate-500">{definition.unit}</span></p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><Metric label="Target" value={entry.targetValue} /><Metric label="Green" value={entry.greenThreshold} /><Metric label="Amber" value={entry.amberThreshold} /></div>{entry.notes ? <p className="mt-3 line-clamp-2 text-sm text-slate-600">{entry.notes}</p> : null}<p className="mt-3 text-xs text-slate-500">{entry._count.evidenceLinks} evidence link(s)</p></> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No data recorded.</p>}</article>)}</div></section>
      {canEdit ? <KpiCsvImport /> : null}
    </main>;
  } finally { await db.$disconnect(); }
}

function Trend({ entries, start, end }: { entries: { reportingMonth: Date; actualValue: number; ragStatus: string }[]; start: Date; end: Date }) {
  const months: Date[] = []; for (let date = start; date <= end; date = addMonths(date, 1)) months.push(date);
  const max = Math.max(1, ...entries.map((item) => Math.abs(item.actualValue)));
  return <div className="mt-6"><div className="flex h-52 items-end gap-2 border-b border-slate-200 px-1">{months.map((date) => { const entry = entries.find((item) => monthKey(item.reportingMonth) === monthKey(date)); return <div key={monthKey(date)} className="flex h-full flex-1 items-end"><div title={entry ? `${monthKey(date)}: ${entry.actualValue}` : `${monthKey(date)}: No data recorded`} className={`w-full rounded-t ${entry ? entry.ragStatus === "GREEN" ? "bg-emerald-600" : entry.ragStatus === "AMBER" ? "bg-amber-500" : "bg-red-600" : "h-1 bg-slate-200"}`} style={entry ? { height: `${Math.max(5, Math.abs(entry.actualValue) / max * 100)}%` } : undefined} /></div>; })}</div><div className="mt-2 flex gap-2 text-[10px] text-slate-500">{months.map((date) => <span key={monthKey(date)} className="flex-1 text-center">{date.toLocaleString("en-GB", { month: "narrow", timeZone: "UTC" })}</span>)}</div></div>;
}
function Stat({ label, value, tone }: { label: string; value: number; tone: string }) { const style = tone === "green" ? "border-emerald-200 bg-emerald-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : tone === "red" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"; return <div className={`rounded-2xl border p-5 ${style}`}><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">{label}</p><p className="font-bold">{value}</p></div>; }
function comparisonWidth(value: number, values: number[]) { const max = Math.max(1, ...values.map(Math.abs)); return Math.max(3, Math.abs(value) / max * 100); }
function href(query: Query, updates: Record<string, string>) { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value) params.set(key, Array.isArray(value) ? value[0] : value); for (const [key, value] of Object.entries(updates)) params.set(key, value); return `/kpis?${params}`; }
