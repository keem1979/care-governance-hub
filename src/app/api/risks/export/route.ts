import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { riskScopeWhere } from "@/lib/risks";

export async function GET(request: Request) {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT); const format = new URL(request.url).searchParams.get("format") === "xls" ? "xls" : "csv"; const db = createDb();
  const risks = await db.risk.findMany({ where: riskScopeWhere(context), include: { location: { select: { name: true } }, owner: { select: { name: true } } }, orderBy: { residualScore: "desc" } }).finally(() => db.$disconnect());
  const header = ["Reference","Title","Risk statement","Category","Source","Source reference","Location","Inherent score","Inherent level","Existing controls","Control effectiveness","Current score","Current level","Appetite","Tolerance","Treatment strategy","Further controls","Target score","Target level","Key risk indicator","Indicator threshold","Escalation route","Status","Owner","Target date","Next review"];
  const rows = risks.map((risk) => [risk.reference,risk.title,risk.description,risk.category,risk.sourceType,risk.sourceReference,risk.location?.name ?? "Organisation-wide",risk.initialScore,risk.initialLevel,risk.existingControls,risk.controlEffectiveness,risk.residualScore,risk.residualLevel,risk.appetite,risk.toleranceScore,risk.treatmentStrategy,risk.furtherControls,risk.targetScore,risk.targetLevel,risk.keyRiskIndicator,risk.indicatorThreshold,risk.escalationRoute,risk.status,risk.owner?.name ?? "",risk.targetDate?.toISOString().slice(0,10)??"",risk.nextReviewDate.toISOString().slice(0,10)]);
  if (format === "xls") {
    const sheet = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Risk Register" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Table>${[header,...rows].map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${xml(cell)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
    return new Response(sheet, { headers: { "Content-Type": "application/vnd.ms-excel", "Content-Disposition": 'attachment; filename="risk-register.xls"' } });
  }
  return new Response(`\uFEFF${[header,...rows].map((row) => row.map(csv).join(",")).join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="risk-register.csv"' } });
}
function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"','""')}"`; }
function xml(value: unknown) { return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
