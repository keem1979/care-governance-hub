import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { integrationReviewCsv } from "@/lib/integrations";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE);
  const db = createDb();
  try {
    await db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "REPORT_GENERATION", recordType: "IntegrationReview", summary: "Exported the external integration candidate review schedule.", afterValue: { externalConnectionsActive: 0 } } });
    return new Response(integrationReviewCsv(), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="integration-assurance-review.csv"', "Cache-Control": "private, no-store" } });
  } finally { await db.$disconnect(); }
}
