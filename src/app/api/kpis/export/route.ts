import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { monthKey } from "@/lib/kpis";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request) {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const params = new URL(request.url).searchParams;
  const month = params.get("month");
  const locationId = params.get("location") || "";
  const db = createDb();
  try {
    const entries = await db.kpiEntry.findMany({ where: { organisationId: context.organisation.id, ...(month ? { reportingMonth: new Date(`${month}-01T12:00:00Z`) } : {}), ...(locationId ? { locationId } : {}), ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }) }, include: { kpi: true, location: { select: { name: true } }, createdBy: { select: { name: true } }, _count: { select: { evidenceLinks: true } } }, orderBy: [{ reportingMonth: "desc" }, { kpi: { sortOrder: "asc" } }] });
    const header = ["KPI", "Month", "Location", "Actual", "Unit", "Target", "Green threshold", "Amber threshold", "RAG", "Notes", "Evidence", "Recorded by"];
    const rows = entries.map((item) => [item.kpi.name, monthKey(item.reportingMonth), item.location?.name ?? "Organisation-wide", item.actualValue, item.kpi.unit, item.targetValue, item.greenThreshold, item.amberThreshold, item.ragStatus, item.notes ?? "", item._count.evidenceLinks, item.createdBy.name]);
    return new Response(`\uFEFF${[header, ...rows].map((row) => row.map(csv).join(",")).join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="kpi-report.csv"' } });
  } finally {
    await db.$disconnect();
  }
}
function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
