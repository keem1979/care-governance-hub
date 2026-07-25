import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { inspectionLabel, inspectionScopeWhere } from "@/lib/inspection";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT), db = createDb();
  try {
    const requirements = await db.complianceRequirement.findMany({ where: inspectionScopeWhere(context), include: { owner: { select: { name: true } }, location: { select: { name: true } }, evidenceLinks: { include: { evidence: { select: { title: true } } } }, _count: { select: { auditLinks: true, registerLinks: true, actionLinks: true } } }, orderBy: [{ keyQuestion: "asc" }, { title: "asc" }] });
    const header = ["Key question","Quality statement","Requirement","Status","Owner","Location","Review date","Documents","Document names","Audits","Register entries","Actions","Confidence note"];
    const rows = requirements.map((item) => [inspectionLabel(item.keyQuestion),item.qualityStatement ?? "",item.title,inspectionLabel(item.evidenceStatus),item.owner?.name ?? "Unassigned",item.location?.name ?? "Organisation-wide",item.reviewDate?.toISOString().slice(0,10) ?? "",item.evidenceLinks.length,item.evidenceLinks.map(({ evidence }) => evidence.title).join("; "),item._count.auditLinks,item._count.registerLinks,item._count.actionLinks,item.confidenceNote ?? ""]);
    return new Response(`\uFEFF${[header,...rows].map((row) => row.map(csv).join(",")).join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="inspection-evidence-index.csv"' } });
  } finally { await db.$disconnect(); }
}
function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"','""')}"`; }
