import Link from "next/link";
import { MonthlyKpiReturnForm } from "@/components/monthly-kpi-return-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import type { KpiReturnData } from "@/lib/kpi-suite";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

type Query = Record<string, string | string[] | undefined>;

export default async function MonthlyKpiReturnPage({ searchParams }: { searchParams: Promise<Query> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const query = await searchParams;
  const requestedId = String(query.id ?? "");
  const db = createDb();
  try {
    const existing = requestedId ? await db.kpiReturn.findFirst({ where: { id: requestedId, organisationId: context.organisation.id } }) : null;
    return <main className="mx-auto max-w-7xl space-y-6">
      <header>
        <Link href="/kpis" className="text-sm font-semibold text-emerald-700">Back to KPI Suite</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Local authority return</p><h1 className="text-3xl font-bold">{existing ? "Update monthly KPI return" : "Start monthly KPI return"}</h1><p className="mt-1 max-w-3xl text-slate-600">Record branch activity once, check the figures, and use the saved summary to complete the commissioner return.</p></div>
          <Link href="/kpis/returns" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">Return history</Link>
        </div>
      </header>
      <MonthlyKpiReturnForm
        locations={context.locations.map(({ id, name, code }) => ({ id, name, code }))}
        currentUserCanSubmit={hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT)}
        initial={existing ? {
          id: existing.id,
          reportingMonth: existing.reportingMonth.toISOString().slice(0, 7),
          locationId: existing.locationId,
          localAuthority: existing.localAuthority,
          contractName: existing.contractName ?? "",
          providerCode: existing.providerCode ?? "",
          locationCode: existing.locationCode ?? "",
          ecmSystem: existing.ecmSystem ?? "",
          managerComment: existing.managerComment ?? "",
          status: existing.status,
          data: existing.data as KpiReturnData,
        } : undefined}
      />
    </main>;
  } finally {
    await db.$disconnect();
  }
}
