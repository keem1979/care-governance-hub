import { requireAuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { safeDownloadName } from "@/lib/policies";
import { getPrivateFile } from "@/lib/private-storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const context = await requireAuthorisedContext();
  const canView = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW) || hasPermission(context.permissions, PERMISSIONS.EVIDENCE_UPLOAD);
  if (!canView) return new Response("Forbidden", { status: 403 });
  const { id, versionId } = await params;
  const db = createDb();
  try {
    const version = await db.evidenceVersion.findFirst({ where: {
      id: versionId, evidenceId: id, evidence: {
        AND: [
          evidenceScopeWhere(context),
          ...(hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW) ? [] : [{ OR: [{ ownerId: context.user.id }, { uploadedById: context.user.id }] }]),
        ],
      },
    }, select: { storageKey: true, fileName: true, contentType: true, evidence: { select: { title: true, locationId: true } } } });
    if (!version) return new Response("Not found", { status: 404 });
    const body = await getPrivateFile(version.storageKey);
    if (!body) return new Response("Document unavailable", { status: 404 });
    const download = new URL(request.url).searchParams.get("download") === "1";
    if (download) await db.activityLog.create({ data: {
      organisationId: context.organisation.id,
      locationId: version.evidence.locationId,
      userId: context.user.id,
      action: "DOWNLOAD",
      recordType: "Evidence",
      recordId: id,
      summary: `Downloaded evidence file: ${version.evidence.title}`,
      afterValue: { versionId, fileName: version.fileName },
    } });
    return new Response(body, { headers: {
      "Content-Type": version.contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeDownloadName(version.fileName)}"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } finally { await db.$disconnect(); }
}
