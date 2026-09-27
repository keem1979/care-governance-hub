import "server-only";

import type { AuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { obligationIsOverdue } from "@/lib/governance-control";
import { type KpiReturnData, validateKpiReturn } from "@/lib/kpi-suite";
import { monthKey } from "@/lib/kpis";
import { registerScopeWhere } from "@/lib/registers";

export type CommissionerReadinessException = {
  id: string;
  source: "Governance obligation" | "Monthly KPI return" | "Commissioner contract register";
  href: string;
  title: string;
  status: string;
  dueAt: Date | null;
  location: string;
  dataCheckCount: number;
  overdue: boolean;
};

/** Source-linked work that may need review. No row is an assurance or compliance decision. */
export async function getCommissionerReadinessExceptions(context: AuthorisedContext, now = new Date()): Promise<CommissionerReadinessException[]> {
  const db = createDb();
  const locationIds = context.locations.map((item) => item.id);
  const optionalLocationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: locationIds } }] };
  try {
    const [obligations, returns, contracts] = await Promise.all([
      db.governanceObligation.findMany({
        where: {
          organisationId: context.organisation.id,
          ...optionalLocationScope,
          obligationType: { in: ["COMMISSIONER_RETURN", "CONTRACT_REVIEW"] },
          status: { notIn: ["ACCEPTED", "CLOSED", "CANCELLED"] },
        },
        select: { id: true, reference: true, title: true, status: true, dueAt: true, location: { select: { name: true } } },
        orderBy: { dueAt: "asc" }, take: 500,
      }),
      db.kpiReturn.findMany({
        where: { organisationId: context.organisation.id, ...(context.allLocations ? {} : { locationId: { in: locationIds } }) },
        select: { id: true, localAuthority: true, reportingMonth: true, status: true, data: true, location: { select: { name: true } } },
        orderBy: { reportingMonth: "desc" }, take: 500,
      }),
      db.registerEntry.findMany({
        where: { ...registerScopeWhere(context), definition: { key: "commissioner-contracts" }, status: { notIn: ["CLOSED", "ARCHIVED"] } },
        select: { id: true, reference: true, title: true, status: true, location: { select: { name: true } } },
        orderBy: { eventDate: "desc" }, take: 500,
      }),
    ]);

    const obligationRows = obligations.map((item) => ({
      id: item.id, source: "Governance obligation" as const, href: "/governance-control",
      title: `${item.reference} · ${item.title}`, status: item.status, dueAt: item.dueAt,
      location: item.location?.name ?? "Organisation-wide", dataCheckCount: 0,
      overdue: obligationIsOverdue(item, now),
    }));
    const returnRows = returns.flatMap((item) => {
      const dataCheckCount = validateKpiReturn(item.data as KpiReturnData).length;
      if (!["DRAFT", "READY_FOR_REVIEW"].includes(item.status) && dataCheckCount === 0) return [];
      return [{
        id: item.id, source: "Monthly KPI return" as const, href: `/kpis/returns/${item.id}`,
        title: `${item.localAuthority} · ${monthKey(item.reportingMonth)}`, status: item.status,
        dueAt: null, location: item.location.name, dataCheckCount, overdue: false,
      }];
    });
    const contractRows = contracts.map((item) => ({
      id: item.id, source: "Commissioner contract register" as const, href: `/registers/commissioner-contracts/${item.id}`,
      title: `${item.reference} · ${item.title}`, status: item.status, dueAt: null,
      location: item.location?.name ?? "Organisation-wide", dataCheckCount: 0, overdue: false,
    }));
    return [...obligationRows, ...returnRows, ...contractRows];
  } finally {
    await db.$disconnect();
  }
}
