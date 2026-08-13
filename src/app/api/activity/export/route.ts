import { activityCsv, activityFocusActions, parseActivityFilters } from "@/lib/activity";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request) {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const filters = parseActivityFilters(Object.fromEntries(new URL(request.url).searchParams.entries()), context.locations.map((item) => item.id));
  const locationScope = filters.locationId ? { locationId: filters.locationId } : context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] };
  const focusActions = activityFocusActions(filters.focus);
  const where = {
    organisationId: context.organisation.id,
    AND: [locationScope, ...(filters.q ? [{ OR: [{ summary: { contains: filters.q, mode: "insensitive" as const } }, { recordType: { contains: filters.q, mode: "insensitive" as const } }, { recordId: { contains: filters.q, mode: "insensitive" as const } }, { user: { name: { contains: filters.q, mode: "insensitive" as const } } }] }] : [])],
    ...(filters.action ? { action: filters.action as never } : focusActions ? { action: { in: [...focusActions] as never[] } } : {}),
    ...(filters.recordType ? { recordType: filters.recordType } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
  };
  const db = createDb();
  try {
    const rows = await db.activityLog.findMany({ where, include: { user: { select: { name: true, email: true } }, location: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 5000 });
    await db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "REPORT_GENERATION", recordType: "ActivityLog", summary: `Exported activity log (${rows.length} records).`, afterValue: { filters: { focus: filters.focus, action: filters.action, recordType: filters.recordType, userId: filters.userId, locationId: filters.locationId, from: filters.from, to: filters.to }, recordCount: rows.length, exportLimit: 5000 } } });
    return new Response(activityCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="activity-log.csv"' } });
  } finally {
    await db.$disconnect();
  }
}
