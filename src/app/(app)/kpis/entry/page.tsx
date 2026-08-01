import Link from "next/link";
import { KpiEntryForm } from "@/components/kpi-entry-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { monthKey } from "@/lib/kpis";
import { PERMISSIONS } from "@/lib/permissions";
import { isAutoCalculatedKpi } from "@/lib/commissioner-kpis";

export default async function KpiEntryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const query = await searchParams;
  const defaultMonth = /^\d{4}-\d{2}$/.test(String(query.month)) ? String(query.month) : monthKey(new Date());
  const db = createDb();
  try {
    const [definitions, evidence] = await Promise.all([
      db.kpiDefinition.findMany({ where: { organisationId: context.organisation.id, isActive: true }, orderBy: { sortOrder: "asc" } }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 200 }),
    ]);
    const manualDefinitions = definitions.filter((definition) => !isAutoCalculatedKpi(definition.slug));
    return <main className="mx-auto max-w-4xl space-y-5"><div><Link href="/kpis" className="text-sm font-semibold text-emerald-700">Back to KPI Suite</Link><h1 className="mt-2 text-3xl font-bold">Enter monthly KPI</h1><p className="mt-1 text-slate-600">Saving the same KPI, month and location updates the existing entry. Calculated rates are updated from the monthly performance return.</p></div><KpiEntryForm definitions={manualDefinitions} locations={context.locations.map(({ id, name }) => ({ id, name }))} evidence={evidence.map(({ id, title }) => ({ id, name: title }))} defaultMonth={defaultMonth} /></main>;
  } finally { await db.$disconnect(); }
}
