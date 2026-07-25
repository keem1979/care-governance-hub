import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { generateReport } from "@/lib/report-data";
import { PERMISSIONS } from "@/lib/permissions";
import {
  isReportType,
  parseReportFilters,
  reportCsv,
} from "@/lib/reports";

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const { type } = await params;
  if (!isReportType(type)) return Response.json({ error: "Report not found." }, { status: 404 });
  const search = new URL(request.url).searchParams;
  const query = Object.fromEntries(search.entries());
  const filters = parseReportFilters(query, context.locations.map((item) => item.id));
  const report = await generateReport(type, context, filters);
  const db = createDb();
  try {
    await db.activityLog.create({
      data: {
        organisationId: context.organisation.id,
        locationId: filters.locationId,
        userId: context.user.id,
        action: "REPORT_GENERATION",
        recordType: "Report",
        recordId: type,
        summary: `Generated ${type.replaceAll("-", " ")} report (${report.rows.length} records).`,
        afterValue: {
          from: filters.from,
          to: filters.to,
          status: filters.status,
          category: filters.category,
          appendices: filters.appendices,
          recordCount: report.rows.length,
        },
      },
    });
  } finally {
    await db.$disconnect();
  }
  return new Response(reportCsv(report.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-report.csv"`,
    },
  });
}
