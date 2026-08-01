import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { calculateKpiReturnSummary, KPI_RETURN_FIELDS, type KpiReturnData } from "@/lib/kpi-suite";
import { monthKey } from "@/lib/kpis";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const { id } = await params;
  const db = createDb();
  try {
    const item = await db.kpiReturn.findFirst({
      where: { id, organisationId: context.organisation.id, ...(context.allLocations ? {} : { locationId: { in: context.locations.map(({ id: locationId }) => locationId) } }) },
      include: { location: { select: { name: true } } },
    });
    if (!item) return new Response("Return not found.", { status: 404 });
    const data = item.data as KpiReturnData;
    const summary = calculateKpiReturnSummary(data);
    const rows = [
      ["Reporting month", monthKey(item.reportingMonth)],
      ["Branch", item.location.name],
      ["Commissioner or contract owner", item.localAuthority],
      ["Contract", item.contractName ?? ""],
      ["Provider identifier", item.providerCode ?? ""],
      ["Service identifier", item.locationCode ?? ""],
      ["Electronic call monitoring system", item.ecmSystem ?? ""],
      ...KPI_RETURN_FIELDS.map((field) => [field.label, String(data[field.key] ?? 0)]),
      ["CALC", "Successful delivery rate", String(summary.successfulDeliveryRate ?? "")],
      ["CALC", "Provider exception rate", String(summary.providerExceptionRate ?? "")],
      ["CALC", "Restart acceptance rate", String(summary.restartAcceptanceRate ?? "")],
      ["CALC", "New staff rate", String(summary.staffJoinerRate ?? "")],
      ["CALC", "Valid Care Certificate rate", String(summary.careCertificateRate ?? "")],
      ["CALC", "Referral response rate", String(summary.referralResponseRate ?? "")],
      ["Manager commentary", item.managerComment ?? ""],
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kpi-return-${monthKey(item.reportingMonth)}.csv"` } });
  } finally { await db.$disconnect(); }
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
