import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceDisplayStatus, evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { safeDownloadName } from "@/lib/policies";

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const date = (value: Date | null) => value?.toISOString().slice(0, 10) ?? "";

export async function GET() {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const db = createDb();
  const items = await db.evidence.findMany({
    where: evidenceScopeWhere(context),
    include: { owner: { select: { name: true } }, location: { select: { name: true } }, uploadedBy: { select: { name: true } }, currentVersion: { select: { versionNumber: true, fileName: true } } },
    orderBy: { title: "asc" },
  }).finally(() => db.$disconnect());
  const rows = [["Title","Category","Type","Location","Owner","Evidence date","Review or expiry","Status","Confidentiality","Version","File","Related module","Related record","Tags","Uploaded by"],
    ...items.map((item) => [item.title,item.category,item.evidenceType,item.location?.name ?? "Organisation-wide",item.owner.name,date(item.evidenceDate),date(item.reviewExpiryDate),evidenceDisplayStatus(item.status,item.reviewExpiryDate),item.confidentiality,item.currentVersion?.versionNumber,item.currentVersion?.fileName,item.relatedModule,item.relatedRecordId,item.tags.join("; "),item.uploadedBy.name])];
  return new Response(`\uFEFF${rows.map((row) => row.map(csv).join(",")).join("\r\n")}`, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeDownloadName(context.organisation.slug)}-evidence-index.csv"`,
    "Cache-Control": "private, no-store",
  } });
}
