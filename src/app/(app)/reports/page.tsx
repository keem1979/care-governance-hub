import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";
import { REPORT_DEFINITIONS } from "@/lib/reports";

export default async function ReportsPage() {
  await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  return (
    <main className="space-y-7">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Controlled reporting</p>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Generate inspection-ready reports from authorised, real database records.
        </p>
      </header>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Reports reflect records currently held in Care Governance Hub. Empty sections mean no matching records were found.
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(REPORT_DEFINITIONS).map(([key, report]) => (
          <Link
            key={key}
            href={`/reports/${key}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Report</p>
            <h2 className="mt-2 text-lg font-bold">{report.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{report.description}</p>
            <p className="mt-5 text-sm font-semibold text-emerald-700">Configure report →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
