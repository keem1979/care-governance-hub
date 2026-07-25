import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { riskScopeWhere, riskStatusLabel } from "@/lib/risks";

export default async function RiskReportPage() {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT); const db = createDb();
  try {
    const risks = await db.risk.findMany({ where: riskScopeWhere(context), include: { location: { select: { name: true } }, owner: { select: { name: true } } }, orderBy: [{ residualScore: "desc" }, { nextReviewDate: "asc" }] });
    return <main className="mx-auto max-w-6xl bg-white p-8 text-slate-900 print:p-0"><header className="flex items-start justify-between border-b-4 border-emerald-800 pb-5"><div><p className="font-bold uppercase tracking-widest text-emerald-800">{context.organisation.name}</p><h1 className="mt-2 text-4xl font-bold">Risk Register</h1><p className="mt-1 text-slate-600">Organisational and service-level risk assurance.</p></div><p className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white print:hidden">Press Ctrl+P to save PDF</p></header><p className="my-5 text-sm text-slate-500">{risks.length} risks · Generated {new Date().toLocaleDateString("en-GB")}</p><table className="w-full border-collapse text-left text-xs"><thead><tr className="bg-slate-100"><th className="border p-2">Reference</th><th className="border p-2">Risk</th><th className="border p-2">Location</th><th className="border p-2">Initial</th><th className="border p-2">Residual</th><th className="border p-2">Status</th><th className="border p-2">Owner</th><th className="border p-2">Next review</th></tr></thead><tbody>{risks.map((risk)=><tr key={risk.id} className="break-inside-avoid"><td className="border p-2 font-mono">{risk.reference}</td><td className="border p-2"><strong>{risk.title}</strong><br/>{risk.category}</td><td className="border p-2">{risk.location?.name??"Organisation"}</td><td className="border p-2">{risk.initialScore} {risk.initialLevel}</td><td className="border p-2">{risk.residualScore} {risk.residualLevel}</td><td className="border p-2">{riskStatusLabel(risk.status)}</td><td className="border p-2">{risk.owner?.name??"Unassigned"}</td><td className="border p-2">{date(risk.nextReviewDate)}</td></tr>)}</tbody></table><footer className="mt-8 border-t pt-3 text-xs text-slate-500">Care Governance Hub · Internal governance record</footer></main>;
  } finally { await db.$disconnect(); }
}
function date(value:Date){return new Intl.DateTimeFormat("en-GB",{dateStyle:"medium"}).format(value)}
