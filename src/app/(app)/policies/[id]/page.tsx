import Link from "next/link";
import { notFound } from "next/navigation";
import { PolicyActions, VersionUpload } from "@/components/policy-actions";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { policyDisplayStatus } from "@/lib/policies";

export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id } = await params;
  const db = createDb();
  const policy = await db.policy.findFirst({
    where: { id, organisationId: context.organisation.id },
    include: { owner: { select: { name: true } }, approvedBy: { select: { name: true } }, currentVersion: true, versions: { include: { uploadedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } } },
  }).finally(() => db.$disconnect());
  if (!policy) notFound();
  const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
  const status = policyDisplayStatus(policy.status, policy.nextReviewDate);
  const currentUrl = policy.currentVersion ? `/api/policies/${policy.id}/versions/${policy.currentVersion.id}/file` : null;
  return <main className="space-y-6">
    <div><Link href="/policies" className="text-sm font-semibold text-emerald-700">← Policy Library</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">{policy.category}</p><h1 className="text-3xl font-bold">{policy.title}</h1><p className="mt-1 text-slate-600">Version {policy.currentVersion?.versionNumber ?? "—"} · {status}</p></div>{canEdit && <div className="flex gap-2"><Link href={`/policies/${id}/edit`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Edit details</Link><PolicyActions id={id} archived={policy.status === "ARCHIVED"} /></div>}</div></div>
    <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Current document</h2>
        {currentUrl ? <><div className="mt-4 flex gap-2"><a href={currentUrl} target="_blank" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Open document</a><a href={`${currentUrl}?download=1`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Download</a></div>{policy.currentVersion?.contentType === "application/pdf" && <iframe title="Policy document preview" src={currentUrl} className="mt-4 h-[520px] w-full rounded-xl border border-slate-200" />}</> : <p className="mt-3 text-slate-600">No current document.</p>}
      </div>
      <div className="space-y-4"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Policy details</h2><dl className="mt-4 space-y-3 text-sm">{[
        ["Owner", policy.owner.name], ["Effective date", formatDate(policy.effectiveDate)], ["Last review", formatDate(policy.lastReviewDate)], ["Next review", formatDate(policy.nextReviewDate)], ["Approval", policy.approvalStatus.replace("_", " ").toLowerCase()], ["Approved by", policy.approvedBy?.name ?? "Not approved"], ["Approved on", formatDate(policy.approvedAt)],
      ].map(([term, value]) => <div key={term} className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">{term}</dt><dd className="text-right font-medium capitalize">{value}</dd></div>)}</dl>{policy.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">{policy.notes}</p>}</section></div>
    </section>
    {canEdit && <section className="space-y-3"><h2 className="text-xl font-bold">Replace current version</h2><VersionUpload id={id} /></section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">Version history</h2><div className="mt-4 divide-y divide-slate-200">{policy.versions.map((version) => <div key={version.id} className="grid gap-2 py-4 text-sm md:grid-cols-[1fr_1fr_1fr_auto]"><div><strong>Version {version.versionNumber}</strong><p className="text-slate-500">{version.fileName}</p></div><div><span className="text-slate-500">Uploaded by</span><p>{version.uploadedBy.name}</p></div><div><span className="text-slate-500">Uploaded</span><p>{formatDate(version.createdAt)}</p></div><a href={`/api/policies/${id}/versions/${version.id}/file?download=1`} className="font-semibold text-emerald-700">Download</a>{version.changeNotes && <p className="md:col-span-4 text-slate-600">{version.changeNotes}</p>}</div>)}</div></section>
  </main>;
}
function formatDate(date: Date | null) { return date ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date) : "Not set"; }
