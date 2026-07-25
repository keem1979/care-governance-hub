import { requirePermission } from "@/lib/auth/dal";
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
  return new Response(reportCsv(report.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-report.csv"`,
    },
  });
}
