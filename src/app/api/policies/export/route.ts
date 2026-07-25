import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { policyDisplayStatus, safeDownloadName } from "@/lib/policies";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function date(value: Date | null) { return value?.toISOString().slice(0, 10) ?? ""; }

export async function GET() {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const db = createDb();
  const policies = await db.policy.findMany({
    where: { organisationId: context.organisation.id },
    include: { owner: { select: { name: true } }, currentVersion: { select: { versionNumber: true, fileName: true } }, approvedBy: { select: { name: true } } },
    orderBy: { title: "asc" },
  }).finally(() => db.$disconnect());
  const header = ["Title", "Category", "Owner", "Version", "Status", "Effective date", "Last review", "Next review", "Approval status", "Approved by", "Approved date", "Current document", "Tags", "Compliance areas"];
  const rows = policies.map((p) => [p.title, p.category, p.owner.name, p.currentVersion?.versionNumber, policyDisplayStatus(p.status, p.nextReviewDate), date(p.effectiveDate), date(p.lastReviewDate), date(p.nextReviewDate), p.approvalStatus, p.approvedBy?.name, date(p.approvedAt), p.currentVersion?.fileName, p.tags.join("; "), p.complianceAreas.join("; ")]);
  const content = [header, ...rows].map((row) => row.map(csv).join(",")).join("\r\n");
  return new Response(`\uFEFF${content}`, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeDownloadName(context.organisation.slug)}-policy-register.csv"`,
    "Cache-Control": "private, no-store",
  } });
}
