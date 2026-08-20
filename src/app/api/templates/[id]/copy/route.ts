import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { deletePrivateFile, getPrivateFile, putPrivateFile } from "@/lib/private-storage";
import { brandedTemplateHtml, templateLogoDataUrl } from "@/lib/template-document";
import { templateEvidenceCategory, templateScopeWhere } from "@/lib/templates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.EVIDENCE_UPLOAD);
  const { id } = await params;
  const form = await request.formData();
  const ownerId = String(form.get("ownerId") ?? "");
  const locationId = String(form.get("locationId") ?? "") || null;
  const db = createDb();
  let storageKey: string | null = null;
  try {
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised location.");
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active evidence owner.");
    const [template, brand] = await Promise.all([
      db.template.findFirst({ where: { id, ...templateScopeWhere(context.organisation.id), status: { not: "ARCHIVED" } } }),
      db.organisation.findUniqueOrThrow({ where: { id: context.organisation.id }, select: { name: true, policyBrandName: true, policyRegistrationNumber: true, policyAddress: true, policyEmail: true, policyPhone: true, policyWebsite: true, policyPrimaryColour: true, policyLogoStorageKey: true, policyLogoContentType: true } }),
    ]);
    if (!template) throw new Error("Template not found.");
    let source: BodyInit | null;
    let fileName = template.fileName;
    let contentType = template.contentType;
    if (template.storageKey) source = await getPrivateFile(template.storageKey);
    else if (template.bodyText) {
      source = brandedTemplateHtml({ title: template.title, category: template.category, version: template.version, bodyText: template.bodyText, brand, logoDataUrl: await templateLogoDataUrl(brand) });
      fileName = `${template.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.html`;
      contentType = "text/html";
    } else source = null;
    if (source === null) throw new Error("Template file is unavailable.");
    const bytes = await new Response(source).arrayBuffer();
    storageKey = `${context.organisation.id}/evidence/${crypto.randomUUID()}`;
    await putPrivateFile(storageKey, bytes);
    const evidence = await db.$transaction(async (tx) => {
      const created = await tx.evidence.create({ data: { organisationId: context.organisation.id, locationId, title: `${template.title} - working copy`, description: `Branded working copy from Template Library: ${template.description}`, category: templateEvidenceCategory(template.category), evidenceType: "Form", sourceType: "SYSTEM_GENERATED", sourceName: "Template Library", sourceReference: `${template.id}@${template.version}`, ownerId, tags: [...template.tags, "template-copy", "organisation-branded"], relatedModule: "Template", relatedRecordId: template.id, confidentiality: "INTERNAL", notes: `Based on ${template.title} version ${template.version}. Organisation branding was applied automatically.`, uploadedById: context.user.id } });
      const version = await tx.evidenceVersion.create({ data: { evidenceId: created.id, versionNumber: "1.0", storageKey: storageKey!, fileName, contentType, sizeBytes: bytes.byteLength, checksum: await hash(bytes), changeNotes: `Branded copy of template version ${template.version}`, uploadedById: context.user.id } });
      await tx.evidence.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "Evidence", recordId: created.id, summary: `Created organisation-branded working copy: ${template.title}`, afterValue: { templateId: template.id, templateVersion: template.version, organisationBrandApplied: true } } });
      return created;
    });
    return NextResponse.json({ id: evidence.id }, { status: 201 });
  } catch (error) {
    if (storageKey) await deletePrivateFile(storageKey);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not copy template." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

async function hash(bytes: ArrayBuffer) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
