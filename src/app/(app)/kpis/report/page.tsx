import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { kpiLabel, monthKey, ragClasses } from "@/lib/kpis";
import { PERMISSIONS } from "@/lib/permissions";
import { kpiSourceLabel } from "@/lib/kpi-sources";

export default async function KpiReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const query = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(String(query.month)) ? String(query.month) : monthKey(new Date());
  const requestedLocation = String(query.location ?? "organisation");
  const locationId = requestedLocation === "organisation" ? null : context.locations.some((item) => item.id === requestedLocation) ? requestedLocation : null;
  const db = createDb();
  try {
    const [definitions, entries] = await Promise.all([
      db.kpiDefinition.findMany({ where: { organisationId: context.organisation.id, isActive: true }, orderBy: { sortOrder: "asc" } }),
      db.kpiEntry.findMany({ where: { organisationId: context.organisation.id, reportingMonth: new Date(`${month}-01T12:00:00Z`), locationId }, include: { kpi: true, _count: { select: { evidenceLinks: true } } } }),
    ]);
    const locationName = locationId ? context.locations.find((item) => item.id === locationId)?.name : "Organisation-wide";
    return <main className="mx-auto max-w-6xl bg-white p-8 text-slate-900 print:p-0"><header className="flex items-start justify-between border-b-4 border-emerald-800 pb-5"><div><p className="font-bold uppercase tracking-widest text-emerald-800">{context.organisation.name}</p><h1 className="mt-2 text-4xl font-bold">Monthly KPI Report</h1><p className="mt-1 text-slate-600">{month} · {locationName}</p></div><p className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white print:hidden">Press Ctrl+P to save PDF</p></header><table className="mt-6 w-full border-collapse text-left text-xs"><thead><tr className="bg-slate-100"><th className="border p-2">KPI</th><th className="border p-2">Actual</th><th className="border p-2">Target</th><th className="border p-2">RAG</th><th className="border p-2">Evidence source</th><th className="border p-2">Notes</th><th className="border p-2">Attachments</th></tr></thead><tbody>{definitions.map((definition) => { const entry = entries.find((item) => item.kpiId === definition.id); return <tr key={definition.id} className="break-inside-avoid"><td className="border p-2"><strong>{definition.name}</strong><br />{kpiLabel(definition.direction)}</td><td className="border p-2">{entry ? `${entry.actualValue} ${definition.unit}` : "No data recorded."}</td><td className="border p-2">{entry?.targetValue ?? definition.targetValue}</td><td className="border p-2">{entry ? <span className={`rounded px-2 py-1 font-bold ${ragClasses(entry.ragStatus)}`}>{entry.ragStatus}</span> : "—"}</td><td className="border p-2">{entry ? <>{kpiSourceLabel(entry.sourceType)}{entry.sourceUrl ? <><br /><a href={entry.sourceUrl} className="font-semibold text-emerald-800 underline">Open source</a></> : null}</> : "—"}</td><td className="border p-2">{entry?.notes ?? ""}</td><td className="border p-2">{entry?._count.evidenceLinks ?? 0}</td></tr>; })}</tbody></table><footer className="mt-8 border-t pt-3 text-xs text-slate-500">QCGMS · Internal governance record · Generated {new Date().toLocaleDateString("en-GB")}</footer></main>;
  } finally { await db.$disconnect(); }
}
