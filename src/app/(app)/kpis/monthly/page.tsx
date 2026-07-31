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
  const requestedMonth = /^\d{4}-\d{2}$/.test(String(query.month)) ? String(query.month) : new Date().toISOString().slice(0, 7);
  const requestedLocation = context.locations.some((location) => location.id === String(query.location)) ? String(query.location) : context.locations[0]?.id ?? "";
  const db = createDb();
  try {
    const existing = requestedId ? await db.kpiReturn.findFirst({ where: { id: requestedId, organisationId: context.organisation.id } }) : null;
    const reportingMonth = new Date(`${requestedMonth}-01T12:00:00Z`);
    const monthEnd = new Date(reportingMonth);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    const registerCounts = existing || !requestedLocation ? [] : await db.registerEntry.groupBy({
      by: ["definitionId"],
      where: {
        organisationId: context.organisation.id,
        locationId: requestedLocation,
        archivedAt: null,
        eventDate: { gte: reportingMonth, lt: monthEnd },
        definition: { key: { in: ["missed-visits", "late-visits", "complaints", "safeguarding"] } },
      },
      _count: { id: true },
    });
    const definitions = registerCounts.length ? await db.registerDefinition.findMany({
      where: { id: { in: registerCounts.map((item) => item.definitionId) } },
      select: { id: true, key: true },
    }) : [];
    const countFor = (key: string) => {
      const definition = definitions.find((item) => item.key === key);
      return definition ? registerCounts.find((item) => item.definitionId === definition.id)?._count.id ?? 0 : 0;
    };
    const activeStaff = existing || !requestedLocation ? 0 : await db.staffMember.count({
      where: { organisationId: context.organisation.id, locationId: requestedLocation, archivedAt: null, employmentStatus: "ACTIVE" },
    });
    const defaultData: KpiReturnData = {
      missedCalls: countFor("missed-visits"),
      lateCalls: countFor("late-visits"),
      complaintsReceived: countFor("complaints"),
      safeguardingReferrals: countFor("safeguarding"),
      staffMonthEnd: activeStaff,
    };
    const sourceCount = requestedLocation ? Object.keys(defaultData).length : 0;
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
        defaults={!existing ? { reportingMonth: requestedMonth, locationId: requestedLocation, data: defaultData, sourceCount } : undefined}
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
