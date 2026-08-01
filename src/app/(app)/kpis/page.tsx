import Link from "next/link";
import { KpiCsvImport } from "@/components/kpi-entry-form";
import { KpiNeedsEntryButton, KpiScorecardEntry } from "@/components/kpi-scorecard-entry";
import { KpiSyncControl } from "@/components/kpi-sync-control";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { commissionerKpiCoverage } from "@/lib/commissioner-kpis";
import { kpiAutoSource } from "@/lib/kpi-sync";
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
    const workbookCoverage = commissionerKpiCoverage();
    const previous = monthKey(addMonths(reportingMonth, -1)), next = monthKey(addMonths(reportingMonth, 1));
    return <main className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Quality intelligence</p><h1 className="text-3xl font-bold">KPI Suite</h1><p className="mt-1 text-slate-600">Monthly commissioner returns, service targets, evidence and performance trends.</p></div><div className="flex flex-wrap gap-2">{canEdit ? <Link href={`/kpis/entry?month=${month}`} className="rounded-xl border border-emerald-700 bg-white px-5 py-3 text-sm font-semibold text-emerald-800">Enter custom KPI</Link> : null}<Link href={`/api/kpis/export?month=${month}${locationId ? `&location=${locationId}` : ""}`} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">Export scorecard</Link><Link href={`/kpis/report?month=${month}&location=${requestedLocation}`} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">PDF / Print</Link></div></header>

      <section className="overflow-hidden rounded-3xl bg-emerald-950 text-white shadow-sm">
        <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Registered Manager workspace</p><h2 className="mt-2 text-2xl font-bold">Monthly local authority KPI return</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/80">Keep branch delivery, workforce, complaints, safeguarding and referral figures together. QCGMS checks totals and calculates the rates you need for month-end reporting.</p></div>
          <div className="flex flex-wrap gap-2">{canEdit ? <Link href={`/kpis/monthly?month=${month}${locationId ? `&location=${locationId}` : ""}`} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-950">Start this month’s return</Link> : null}<Link href="/kpis/returns" className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white">View return history</Link></div>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">2026 commissioner workbook coverage</p><h2 className="mt-1 text-xl font-bold text-blue-950">All {workbookCoverage.totalItems} tracker items are included</h2><p className="mt-1 text-sm text-blue-900">{workbookCoverage.nonNumericItems} ECM field, {workbookCoverage.numericInputs} monthly figures and {workbookCoverage.calculatedMeasures} calculated measures. Saving the monthly return updates the matching scorecard items automatically.</p></div>
          <Link href={`/kpis/monthly?month=${month}${locationId ? `&location=${locationId}` : ""}`} className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white">Open complete return</Link>
        </div>
      </section>

      {canEdit ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><h2 className="text-lg font-bold text-emerald-950">Connected monthly figures</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-900">QCGMS automatically counts records from the operational registers, Action Tracker, workforce records, Audit Centre and Policy Centre. A manager-entered figure is treated as a verified override and will not be replaced automatically.</p></div>
          <KpiSyncControl month={month} locationId={locationId} />
        </div>
      </section> : null}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex gap-2"><Link href={href(query, { month: previous })} className="rounded-lg border px-3 py-2 text-sm">Previous</Link><input form="kpi-filters" type="month" name="month" defaultValue={month} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><Link href={href(query, { month: next })} className="rounded-lg border px-3 py-2 text-sm">Next</Link></div><form id="kpi-filters" className="flex flex-wrap gap-2"><select name="location" defaultValue={requestedLocation} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="organisation">Organisation-wide</option>{context.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="kpi" defaultValue={selectedKpiId} className="max-w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm">{definitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">View</button></form></section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Green" value={counts.GREEN} tone="green" /><Stat label="Amber" value={counts.AMBER} tone="amber" /><Stat label="Red" value={counts.RED} tone="red" /><Stat label="Waiting for an update" value={counts.NONE} tone="slate" /></section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">{selected?.name ?? "KPI"} trend</h2><p className="text-sm text-slate-600">Twelve months ending {month}</p></div><span className="text-sm font-semibold text-slate-500">{selected?.unit}</span></div><Trend entries={trendEntries} start={trendStart} end={reportingMonth} /></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Location comparison</h2><p className="text-sm text-slate-600">{selected?.name} in {month}</p><div className="mt-5 space-y-3">{comparison.length ? comparison.map((item) => <div key={item.id}><div className="flex justify-between text-sm"><span>{item.location?.name ?? "Organisation-wide"}</span><span className="font-bold">{item.actualValue} {selected?.unit}</span></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${item.ragStatus === "GREEN" ? "bg-emerald-600" : item.ragStatus === "AMBER" ? "bg-amber-500" : "bg-red-600"}`} style={{ width: `${comparisonWidth(item.actualValue, comparison.map((entry) => entry.actualValue))}%` }} /></div></div>) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Add this month’s figures to compare performance by location.</p>}</div></div>
      </section>

      <section>
        <div className="mb-4"><h2 className="text-xl font-bold">KPI scorecard and monthly entry</h2><p className="text-sm text-slate-600">{visible.length} standard and commissioner indicators for {month}. Enter or correct a result directly on its card.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(({ definition, entry }) => {
            const source = kpiAutoSource(definition.slug);
            const automaticallySynced = Boolean(entry?.notes?.startsWith("[Auto-synced]"));
            return <article key={definition.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-bold">{definition.name}</h3><p className="mt-1 text-xs text-slate-500">{kpiLabel(definition.direction)} · {definition.unit}</p>{definition.description ? <p className="mt-2 text-xs leading-5 text-slate-600">{definition.description}</p> : null}</div>
                {entry ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ragClasses(entry.ragStatus)}`}>{entry.ragStatus}</span> : canEdit ? <KpiNeedsEntryButton definitionId={definition.id} /> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">NEEDS ENTRY</span>}
              </div>
              {source ? <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${automaticallySynced ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-800"}`}>{automaticallySynced ? `Live from ${source}` : `Can be supplied by ${source}`}</p> : <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Manager entry required — QCGMS does not yet hold this source data.</p>}
              {entry ? <><p className="mt-4 text-3xl font-black">{entry.actualValue}<span className="ml-1 text-sm font-medium text-slate-500">{definition.unit}</span></p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><Metric label="Target" value={entry.targetValue} /><Metric label="Green" value={entry.greenThreshold} /><Metric label="Amber" value={entry.amberThreshold} /></div>{entry.notes && !automaticallySynced ? <p className="mt-3 line-clamp-2 text-sm text-slate-600">{entry.notes}</p> : null}</> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No verified result has been recorded for this month.</p>}
              {canEdit ? <KpiScorecardEntry definition={definition} month={month} locationId={locationId} actualValue={entry?.actualValue} notes={entry?.notes} /> : null}
            </article>;
          })}
        </div>
      </section>
      {canEdit ? <KpiCsvImport /> : null}
    </main>;
  } finally { await db.$disconnect(); }
}

function Trend({ entries, start, end }: { entries: { reportingMonth: Date; actualValue: number; ragStatus: string }[]; start: Date; end: Date }) {
  const months: Date[] = []; for (let date = start; date <= end; date = addMonths(date, 1)) months.push(date);
  const max = Math.max(1, ...entries.map((item) => Math.abs(item.actualValue)));
  return <div className="mt-6"><div className="flex h-52 items-end gap-2 border-b border-slate-200 px-1">{months.map((date) => { const entry = entries.find((item) => monthKey(item.reportingMonth) === monthKey(date)); return <div key={monthKey(date)} className="flex h-full flex-1 items-end"><div title={entry ? `${monthKey(date)}: ${entry.actualValue}` : `${monthKey(date)}: awaiting update`} className={`w-full rounded-t ${entry ? entry.ragStatus === "GREEN" ? "bg-emerald-600" : entry.ragStatus === "AMBER" ? "bg-amber-500" : "bg-red-600" : "h-1 bg-slate-200"}`} style={entry ? { height: `${Math.max(5, Math.abs(entry.actualValue) / max * 100)}%` } : undefined} /></div>; })}</div><div className="mt-2 flex gap-2 text-[10px] text-slate-500">{months.map((date) => <span key={monthKey(date)} className="flex-1 text-center">{date.toLocaleString("en-GB", { month: "narrow", timeZone: "UTC" })}</span>)}</div></div>;
}
function Stat({ label, value, tone }: { label: string; value: number; tone: string }) { const style = tone === "green" ? "border-emerald-200 bg-emerald-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : tone === "red" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"; return <div className={`rounded-2xl border p-5 ${style}`}><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">{label}</p><p className="font-bold">{value}</p></div>; }
function comparisonWidth(value: number, values: number[]) { const max = Math.max(1, ...values.map(Math.abs)); return Math.max(3, Math.abs(value) / max * 100); }
function href(query: Query, updates: Record<string, string>) { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value) params.set(key, Array.isArray(value) ? value[0] : value); for (const [key, value] of Object.entries(updates)) params.set(key, value); return `/kpis?${params}`; }
