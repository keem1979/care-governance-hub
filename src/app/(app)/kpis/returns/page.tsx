import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { monthKey } from "@/lib/kpis";
import { PERMISSIONS } from "@/lib/permissions";

export default async function KpiReturnsPage() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const db = createDb();
  try {
    const returns = await db.kpiReturn.findMany({
      where: { organisationId: context.organisation.id, ...(context.allLocations ? {} : { locationId: { in: context.locations.map(({ id }) => id) } }) },
      include: { location: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: [{ reportingMonth: "desc" }, { location: { name: "asc" } }],
    });
    return <main className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/kpis" className="text-sm font-semibold text-emerald-700">Back to KPI Suite</Link><h1 className="mt-2 text-3xl font-bold">Monthly return history</h1><p className="mt-1 text-slate-600">A branch-by-branch record of drafts, reviews and submissions.</p></div><Link href="/kpis/monthly" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Start a return</Link></header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {returns.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Month</th><th className="px-5 py-3">Branch</th><th className="px-5 py-3">Authority</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Updated</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{returns.map((item) => <tr key={item.id}><td className="px-5 py-4 font-semibold">{monthKey(item.reportingMonth)}</td><td className="px-5 py-4">{item.location.name}</td><td className="px-5 py-4">{item.localAuthority}</td><td className="px-5 py-4"><Status value={item.status} /></td><td className="px-5 py-4 text-slate-500">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }).format(item.updatedAt)}</td><td className="px-5 py-4 text-right"><Link href={`/kpis/returns/${item.id}`} className="font-semibold text-emerald-700">Open</Link></td></tr>)}</tbody></table></div> : <div className="p-10 text-center"><h2 className="font-bold">No monthly returns yet</h2><p className="mt-1 text-sm text-slate-600">Start with the current reporting month for one branch.</p></div>}
      </section>
    </main>;
  } finally { await db.$disconnect(); }
}

function Status({ value }: { value: string }) {
  const style = value === "SUBMITTED" || value === "LOCKED" ? "bg-emerald-100 text-emerald-800" : value === "READY_FOR_REVIEW" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{value.replaceAll("_", " ")}</span>;
}
