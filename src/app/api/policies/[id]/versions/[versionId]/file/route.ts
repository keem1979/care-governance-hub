import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { getPolicyFile } from "@/lib/policy-storage";
import { safeDownloadName } from "@/lib/policies";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id, versionId } = await params;
  const db = createDb();
  try {
    const version = await db.policyVersion.findFirst({
      where: { id: versionId, policyId: id, policy: { organisationId: context.organisation.id } },
      select: { storageKey: true, fileName: true, contentType: true },
    });
    if (!version) return new Response("Not found", { status: 404 });
    const body = await getPolicyFile(version.storageKey);
    if (!body) return new Response("Document unavailable", { status: 404 });
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(body, { headers: {
      "Content-Type": version.contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeDownloadName(version.fileName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } finally {
    await db.$disconnect();
  }
}
