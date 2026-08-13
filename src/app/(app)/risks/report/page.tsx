import { OrganisationDocumentBrand } from "@/components/organisation-document-brand";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { riskScopeWhere, riskStatusLabel } from "@/lib/risks";

export default async function RiskReportPage() {
  const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
  const db = createDb();
  try {
    const risks = await db.risk.findMany({ where: riskScopeWhere(context), include: { location: { select: { name: true } }, owner: { select: { name: true } } }, orderBy: [{ residualScore: "desc" }, { nextReviewDate: "asc" }] });
    return <main className="mx-auto max-w-7xl bg-white p-8 text-slate-900 print:p-0">
      <header className="flex items-start justify-between border-b-4 border-emerald-800 pb-5"><div><OrganisationDocumentBrand name={context.organisation.name} hasLogo={Boolean(context.organisation.policyLogoStorageKey)} /><h1 className="mt-2 text-4xl font-bold">Risk assurance report</h1><p className="mt-1 text-slate-600">Inherent, current and target risk with treatment and tolerance oversight.</p></div><p className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white print:hidden">Press Ctrl+P to save PDF</p></header>
      <p className="my-5 text-sm text-slate-500">{risks.length} risks · Generated {new Date().toLocaleDateString("en-GB")}</p>
      <table className="w-full border-collapse text-left text-[10px]"><thead><tr className="bg-slate-100"><th className="border p-2">Risk</th><th className="border p-2">Source</th><th className="border p-2">Location</th><th className="border p-2">Inherent</th><th className="border p-2">Current</th><th className="border p-2">Target / tolerance</th><th className="border p-2">Treatment</th><th className="border p-2">Owner / review</th></tr></thead><tbody>{risks.map((risk) => <tr key={risk.id} className="break-inside-avoid align-top"><td className="border p-2"><strong>{risk.reference} · {risk.title}</strong><br />{risk.category}<br /><span className="text-slate-500">{risk.description}</span></td><td className="border p-2">{risk.sourceType ?? "Manual identification"}<br />{risk.sourceReference ?? "—"}</td><td className="border p-2">{risk.location?.name ?? "Organisation"}</td><td className="border p-2">{risk.initialScore} {risk.initialLevel}</td><td className="border p-2"><strong>{risk.residualScore} {risk.residualLevel}</strong><br />{risk.controlEffectiveness ?? "Not assessed"}</td><td className="border p-2">{risk.targetScore ?? risk.residualScore} {risk.targetLevel ?? risk.residualLevel}<br />Tolerance ≤ {risk.toleranceScore ?? 8}</td><td className="border p-2">{risk.treatmentStrategy ?? "REDUCE"}<br />{risk.furtherControls ?? "Monitor existing controls"}</td><td className="border p-2">{risk.owner?.name ?? "Unassigned"}<br />{date(risk.nextReviewDate)}<br />{riskStatusLabel(risk.status)}</td></tr>)}</tbody></table>
      <footer className="mt-8 border-t pt-3 text-xs text-slate-500">QCGMS · Organisation-branded controlled governance record</footer>
    </main>;
  } finally { await db.$disconnect(); }
}

function date(value: Date) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value); }
