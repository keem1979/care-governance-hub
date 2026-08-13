import Link from "next/link";
import { notFound } from "next/navigation";
import { OrganisationDocumentBrand } from "@/components/organisation-document-brand";
import { CopyTemplateForm, TemplateActions } from "@/components/template-controls";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { canPreviewTemplate, templateLabel, templateScopeWhere } from "@/lib/templates";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD]);
  const { id } = await params;
  const db = createDb();
  try {
    const template = await db.template.findFirst({ where: { id, ...templateScopeWhere(context.organisation.id) }, include: { author: { select: { name: true } } } });
    if (!template) notFound();
    const canCopy = hasPermission(context.permissions, PERMISSIONS.EVIDENCE_UPLOAD);
    const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT) && template.organisationId === context.organisation.id;
    const members = canCopy ? await db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }) : [];
    const generated = Boolean(template.bodyText && !template.storageKey);
    const previewable = generated || canPreviewTemplate(template.contentType);
    return <main className="mx-auto max-w-6xl space-y-6">
      <div><Link href="/templates" className="text-sm font-semibold text-emerald-700">Back to Template Library</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><OrganisationDocumentBrand name={context.organisation.name} hasLogo={Boolean(context.organisation.policyLogoStorageKey)} /><p className="mt-4 text-sm font-bold uppercase tracking-widest text-emerald-700">{template.category}</p><h1 className="mt-1 text-3xl font-bold">{template.title}</h1><p className="mt-2 max-w-3xl text-slate-600">{template.description}</p></div><div className="flex flex-col items-end gap-2"><span className="rounded-full bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-800">{templateLabel(template.status)}</span>{template.tags.includes("rm-grade") ? <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">Premium RM grade</span> : null}</div></div></div>
      {generated ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-bold text-emerald-950">Your organisation branding is automatic</h2><p className="mt-1 text-sm leading-6 text-emerald-900">The company name, uploaded logo and saved brand colour are applied when this template is previewed, downloaded or copied into the Evidence Library. You do not need to upload the logo again.</p></section> : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Meta label="Version" value={template.version} /><Meta label="Author" value={template.author?.name ?? "QCGMS"} /><Meta label="Review date" value={template.reviewDate ? date(template.reviewDate) : "Not set"} /><Meta label="Source" value={template.organisationId ? "Organisation template" : "Premium starter template"} /></section>
      <section className="grid gap-5 lg:grid-cols-[1fr_340px]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Branded document preview</h2><p className="text-sm text-slate-500">{generated ? "Generated automatically from your saved setup branding" : `${template.fileName} · ${Math.max(1, Math.round(template.sizeBytes / 1024))} KB`}</p></div><a href={`/api/templates/${template.id}/file?download=1`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Download branded document</a></div>{previewable ? <iframe title={`${template.title} preview`} src={`/api/templates/${template.id}/file`} className="mt-4 h-[680px] w-full rounded-xl border bg-white" /> : <div className="mt-4 rounded-xl bg-slate-50 p-10 text-center"><p className="font-semibold">Preview is not available for this file type.</p><p className="mt-1 text-sm text-slate-600">Download the file to open it in the appropriate Office application.</p></div>}</div>
        <aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Template details</h2><dl className="mt-3 space-y-3 text-sm"><div><dt className="font-semibold text-slate-500">Tags</dt><dd>{template.tags.join(", ") || "None"}</dd></div><div><dt className="font-semibold text-slate-500">Document type</dt><dd>{generated ? "Automatically branded HTML document" : template.contentType}</dd></div></dl>{canEdit ? <div className="mt-5 border-t pt-4"><TemplateActions id={template.id} status={template.status} /></div> : null}</section>{canCopy && template.status !== "ARCHIVED" ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-bold">Create a branded working copy</h2><p className="mt-1 text-sm text-slate-600">Creates an organisation-branded copy in the Evidence Library with the current logo already embedded.</p><div className="mt-4"><CopyTemplateForm id={template.id} members={members.map(({ user }) => user)} locations={context.locations.map(({ id: locationId, name }) => ({ id: locationId, name }))} /></div></section> : null}</aside>
      </section>
    </main>;
  } finally { await db.$disconnect(); }
}

function Meta({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-sm">{value}</p></div>; }
function date(value: Date) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value); }
