import Link from "next/link";
import { OrganisationDocumentBrand } from "@/components/organisation-document-brand";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";
import { REPORT_DEFINITIONS } from "@/lib/reports";

const groupOrder = ["Executive assurance", "Quality and compliance", "People, safety and experience", "Risk and improvement", "Performance and evidence"];

export default async function ReportsPage() {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  return (
    <main className="space-y-8">
      <header className="rounded-3xl bg-slate-900 p-7 text-white shadow-sm">
        <OrganisationDocumentBrand name={context.organisation.name} hasLogo={Boolean(context.organisation.policyLogoStorageKey)} />
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Management information and assurance</p>
        <h1 className="mt-2 text-3xl font-bold">Reporting centre</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Generate controlled, board-ready reports from authorised live records. Each report highlights exceptions, overdue activity and matters requiring management judgement.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Info title="Evidence-led" detail="Every result links back to the source record so conclusions can be checked." />
        <Info title="Exception-focused" detail="Overdue, high-risk and weak-assurance records are clearly identified." />
        <Info title="Inspection-ready" detail="Print to a branded PDF or export the complete underlying table to CSV." />
      </section>

      {groupOrder.map((group) => {
        const reports = Object.entries(REPORT_DEFINITIONS).filter(([, report]) => report.group === group);
        return <section key={group} className="space-y-3">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Report collection</p><h2 className="mt-1 text-xl font-bold">{group}</h2></div><p className="text-sm text-slate-500">{reports.length} reports</p></div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Report</th><th className="hidden px-5 py-3 lg:table-cell">Recommended use</th><th className="hidden px-5 py-3 xl:table-cell">Primary audience</th><th className="px-5 py-3 text-right">Open</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{reports.map(([key, report]) => <tr key={key} className="align-top hover:bg-emerald-50/40"><td className="px-5 py-4"><p className="font-bold text-slate-900">{report.title}</p><p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">{report.description}</p></td><td className="hidden px-5 py-4 text-slate-700 lg:table-cell">{report.cadence}</td><td className="hidden px-5 py-4 text-slate-700 xl:table-cell">{report.audience}</td><td className="px-5 py-4 text-right"><Link href={`/reports/${key}`} prefetch={false} className="inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Configure →</Link></td></tr>)}</tbody>
            </table>
          </div>
        </section>;
      })}
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Important:</strong> Automated assurance is a management aid, not a substitute for professional judgement. Empty sections may indicate either no activity or incomplete recording and must be reviewed.</p>
    </main>
  );
}

function Info({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-emerald-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p></div>;
}
