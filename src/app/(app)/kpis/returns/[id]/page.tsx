import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { calculateKpiReturnSummary, formatRate, KPI_RETURN_SECTIONS, type KpiReturnData, validateKpiReturn } from "@/lib/kpi-suite";
import { monthKey } from "@/lib/kpis";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function KpiReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id } = await params;
  const db = createDb();
  try {
    const item = await db.kpiReturn.findFirst({
      where: { id, organisationId: context.organisation.id, ...(context.allLocations ? {} : { locationId: { in: context.locations.map(({ id: locationId }) => locationId) } }) },
      include: { location: { select: { name: true } }, createdBy: { select: { name: true } }, submittedBy: { select: { name: true } } },
    });
    if (!item) notFound();
    const data = item.data as KpiReturnData;
    const summary = calculateKpiReturnSummary(data);
    const errors = validateKpiReturn(data);
    const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT) && item.status !== "LOCKED";
    return <main className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/kpis/returns" className="text-sm font-semibold text-emerald-700">Back to return history</Link><p className="mt-3 text-sm font-bold uppercase tracking-widest text-emerald-700">{item.localAuthority}</p><h1 className="mt-1 text-3xl font-bold">{item.location.name} · {monthKey(item.reportingMonth)}</h1><p className="mt-1 text-slate-600">{item.contractName ?? "Monthly KPI return"}</p></div><div className="flex flex-wrap gap-2 print:hidden">{canEdit ? <Link href={`/kpis/monthly?id=${item.id}`} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">Edit return</Link> : null}<a href={`/api/kpis/returns/${item.id}/export`} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">Download CSV</a><span className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">Use Ctrl+P to print</span></div></header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Rate label="Successful delivery" value={summary.successfulDeliveryRate}/><Rate label="Provider exceptions" value={summary.providerExceptionRate}/><Rate label="Restart acceptance" value={summary.restartAcceptanceRate}/><Rate label="Referral response" value={summary.referralResponseRate}/><Rate label="Care Certificate" value={summary.careCertificateRate}/></section>
      <section className={`rounded-2xl border p-5 ${errors.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><h2 className="font-bold">{errors.length ? `${errors.length} data check${errors.length === 1 ? "" : "s"} to resolve` : "Data checks passed"}</h2>{errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : <p className="mt-1 text-sm">The recorded totals pass the built-in consistency checks.</p>}</section>
      <section className="grid gap-5 xl:grid-cols-2">{KPI_RETURN_SECTIONS.map((section) => <article key={section.key} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">{section.title}</h2><dl className="mt-4 divide-y divide-slate-100">{section.fields.map((field) => <div key={field.key} className="flex items-center justify-between gap-4 py-2.5 text-sm"><dt className="text-slate-600">{field.label}</dt><dd className="font-bold">{Number(data[field.key] ?? 0).toLocaleString("en-GB")}</dd></div>)}</dl></article>)}</section>
      {item.managerComment ? <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Registered Manager commentary</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.managerComment}</p></section> : null}
      <footer className="border-t pt-4 text-xs text-slate-500">QCGMS · Created by {item.createdBy.name}{item.submittedBy ? ` · Submitted by ${item.submittedBy.name}` : ""} · Internal service-performance and governance record.</footer>
    </main>;
  } finally { await db.$disconnect(); }
}

function Rate({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{formatRate(value)}</p></div>;
}
