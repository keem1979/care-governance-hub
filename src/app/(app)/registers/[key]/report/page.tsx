import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { registerScopeWhere, registerStatusLabel } from "@/lib/registers";
export default async function RegisterReportPage({ params }: {
    params: Promise<{
        key: string;
    }>;
}) { const context = await requirePermission(PERMISSIONS.REPORTS_EXPORT); const { key } = await params; const db = createDb(); try {
    const definition = await db.registerDefinition.findFirst({ where: { key, isPublished: true, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] } });
    if (!definition)
        notFound();
    const entries = await db.registerEntry.findMany({ where: { ...registerScopeWhere(context), definitionId: definition.id }, include: { location: { select: { name: true } }, owner: { select: { name: true } }, _count: { select: { evidenceLinks: true } } }, orderBy: { eventDate: "desc" } });
    return <main className="mx-auto max-w-6xl bg-white p-8 text-slate-900 print:p-0"><header className="flex items-start justify-between border-b-4 border-emerald-800 pb-5"><div><p className="font-bold uppercase tracking-widest text-emerald-800">{context.organisation.name}</p><h1 className="mt-2 text-4xl font-bold">{definition.name} register</h1><p className="mt-1 text-slate-600">{definition.description}</p></div><p className="print:hidden rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Press Ctrl+P to save PDF</p></header><p className="my-5 text-sm text-slate-500">{entries.length} entries · Generated {new Date().toLocaleDateString("en-GB")}</p><table className="w-full border-collapse text-left text-xs"><thead><tr className="bg-slate-100"><th className="border p-2">Reference</th><th className="border p-2">Date</th><th className="border p-2">Title and summary</th><th className="border p-2">Risk</th><th className="border p-2">Status</th><th className="border p-2">Location</th><th className="border p-2">Owner</th><th className="border p-2">Evidence</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="break-inside-avoid"><td className="border p-2 font-mono">{entry.reference}</td><td className="border p-2">{date(entry.eventDate)}</td><td className="border p-2"><strong>{entry.title}</strong><br />{entry.summary}</td><td className="border p-2">{entry.riskLevel}</td><td className="border p-2">{registerStatusLabel(entry.status)}</td><td className="border p-2">{entry.location?.name ?? "Organisation"}</td><td className="border p-2">{entry.owner?.name ?? "Unassigned"}</td><td className="border p-2">{entry._count.evidenceLinks}</td></tr>)}</tbody></table><footer className="mt-8 border-t pt-3 text-xs text-slate-500">QCGMS · Internal governance record · Use first names and internal references only.</footer></main>;
}
finally {
    await db.$disconnect();
} }
function date(value: Date) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value); }
