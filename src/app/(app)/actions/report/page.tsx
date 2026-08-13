import { OrganisationDocumentBrand } from "@/components/organisation-document-brand";
import { requirePermission } from "@/lib/auth/dal";
import { actionLabel, actionScopeWhere, effectiveActionStatus } from "@/lib/actions";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ActionReportPage() {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const db = createDb();
  try {
    const actions = await db.action.findMany({ where: actionScopeWhere(context), include: { owner: { select: { name: true } }, location: { select: { name: true } }, _count: { select: { evidenceLinks: true } } }, orderBy: [{ dueDate: "asc" }, { priority: "desc" }] });
    return <main className="mx-auto max-w-6xl bg-white p-8 text-slate-900 print:p-0">
      <header className="flex items-start justify-between border-b-4 border-emerald-800 pb-5"><div><OrganisationDocumentBrand name={context.organisation.name} hasLogo={Boolean(context.organisation.policyLogoStorageKey)} /><h1 className="mt-2 text-4xl font-bold">Improvement Action Report</h1><p className="mt-1 text-slate-600">Accountability, measurable outcomes and evidence-based closure.</p></div><p className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white print:hidden">Press Ctrl+P to save PDF</p></header>
      <p className="my-5 text-sm text-slate-500">{actions.length} actions · Generated {new Date().toLocaleDateString("en-GB")}</p>
      <table className="w-full border-collapse text-left text-xs"><thead><tr className="bg-slate-100"><th className="border p-2">Reference</th><th className="border p-2">Action and outcome</th><th className="border p-2">Source</th><th className="border p-2">Priority</th><th className="border p-2">Progress</th><th className="border p-2">Owner</th><th className="border p-2">Due</th><th className="border p-2">Evidence</th></tr></thead><tbody>{actions.map((item) => <tr key={item.id} className="break-inside-avoid"><td className="border p-2 font-mono">{item.reference}<br />{item.category}</td><td className="border p-2"><strong>{item.title}</strong><br />{item.expectedOutcome ?? item.description}<br /><em>{item.successMeasure ?? "Success measure not recorded"}</em></td><td className="border p-2">{actionLabel(item.sourceType)}<br />{item.sourceReference ?? ""}</td><td className="border p-2">{actionLabel(item.priority)}</td><td className="border p-2">{actionLabel(effectiveActionStatus(item.status, item.dueDate))}<br />{item.progressPercent}%</td><td className="border p-2">{item.owner.name}</td><td className="border p-2">{date(item.dueDate)}</td><td className="border p-2">{item._count.evidenceLinks}</td></tr>)}</tbody></table>
      <footer className="mt-8 border-t pt-3 text-xs text-slate-500">QCGMS · Organisation-branded internal governance record</footer>
    </main>;
  } finally { await db.$disconnect(); }
}

function date(value: Date) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value); }
