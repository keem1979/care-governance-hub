import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { getPrivateFile } from "@/lib/private-storage";
import { safeDownloadName } from "@/lib/policies";
import { brandedTemplateHtml, templateLogoDataUrl } from "@/lib/template-document";
import { templateScopeWhere } from "@/lib/templates";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD]);
  const { id } = await params;
  const db = createDb();
  try {
    const [template, brand] = await Promise.all([
      db.template.findFirst({ where: { id, ...templateScopeWhere(context.organisation.id) }, select: { title: true, category: true, version: true, fileName: true, contentType: true, storageKey: true, bodyText: true } }),
      db.organisation.findUniqueOrThrow({ where: { id: context.organisation.id }, select: { name: true, policyBrandName: true, policyRegistrationNumber: true, policyAddress: true, policyEmail: true, policyPhone: true, policyWebsite: true, policyPrimaryColour: true, policyLogoStorageKey: true, policyLogoContentType: true } }),
    ]);
    if (!template) return new Response("Not found", { status: 404 });
    let body: BodyInit | null;
    let contentType = template.contentType;
    let fileName = template.fileName;
    if (template.storageKey) body = await getPrivateFile(template.storageKey);
    else if (template.bodyText) {
      body = brandedTemplateHtml({ title: template.title, category: template.category, version: template.version, bodyText: template.bodyText, brand, logoDataUrl: await templateLogoDataUrl(brand) });
      contentType = "text/html; charset=utf-8";
      fileName = `${template.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.html`;
    } else body = null;
    if (body === null) return new Response("Template file unavailable", { status: 404 });
    const download = new URL(request.url).searchParams.get("download") === "1";
    if (download) await db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "DOWNLOAD", recordType: "Template", recordId: id, summary: `Downloaded branded template: ${template.title}`, afterValue: { fileName, organisationBrandApplied: true } } });
    return new Response(body, { headers: { "Content-Type": contentType, "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeDownloadName(fileName)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'" } });
  } finally { await db.$disconnect(); }
}
