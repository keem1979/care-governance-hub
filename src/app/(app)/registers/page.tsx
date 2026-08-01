import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { REGISTER_GROUPS, registerGroupKey, registerScopeWhere } from "@/lib/registers";

export default async function RegistersPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const params = await searchParams;
  const q = String(params.q ?? "").trim().toLowerCase();
  const requestedGroup = String(params.group ?? "");
  const db = createDb();
  const [definitions, counts] = await Promise.all([
    db.registerDefinition.findMany({
      where: { isPublished: true, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] },
      orderBy: { sortOrder: "asc" },
    }),
    db.registerEntry.groupBy({ by: ["definitionId"], where: registerScopeWhere(context), _count: { _all: true } }),
  ]).finally(() => db.$disconnect());
  const countMap = new Map(counts.map((item) => [item.definitionId, item._count._all]));
  const filtered = definitions.filter((definition) =>
    (!q || `${definition.name} ${definition.description ?? ""}`.toLowerCase().includes(q)) &&
    (!requestedGroup || registerGroupKey(definition.key) === requestedGroup),
  );
  const groups = REGISTER_GROUPS.map((group) => ({ ...group, definitions: filtered.filter((definition) => registerGroupKey(definition.key) === group.key) })).filter((group) => group.definitions.length);

  return <main className="space-y-7">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Registered Manager workspace</p><h1 className="text-3xl font-bold">Comprehensive Registers</h1><p className="mt-1 max-w-3xl text-slate-600">Structured operational records for safety, people’s rights, medicines, workforce, service delivery and governance.</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-center"><p className="text-3xl font-bold text-emerald-950">{definitions.length}</p><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">available registers</p></div></header>
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-bold text-emerald-950">Every saved record becomes accessible evidence</h2><p className="mt-1 text-sm leading-6 text-emerald-900">Register entries sync automatically to the Evidence Library and matching Evidence Requirements. Update the original register record to keep one reliable source of truth.</p><Link href="/evidence" className="mt-3 inline-flex text-sm font-bold text-emerald-800">Open Evidence Library →</Link></section>
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[2fr_1fr_auto]"><input name="q" defaultValue={String(params.q ?? "")} placeholder="Search registers, for example consent, RIDDOR or medicines" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/><select name="group" defaultValue={requestedGroup} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All register groups</option>{REGISTER_GROUPS.map((group)=><option key={group.key} value={group.key}>{group.name}</option>)}</select><button className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Find register</button></form>
    {!groups.length ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-bold">No matching register</h2><p className="mt-2 text-slate-600">Try a broader search or choose all register groups.</p></section> : groups.map((group)=><section key={group.key} className="space-y-4"><div><h2 className="text-xl font-bold">{group.name}</h2><p className="mt-1 text-sm text-slate-600">{group.description}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.definitions.map((definition)=><Link key={definition.id} href={`/registers/${definition.key}`} prefetch={false} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold">{definition.name}</h3><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">{countMap.get(definition.id) ?? 0}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{definition.description}</p><p className="mt-4 text-sm font-semibold text-emerald-700">Open register →</p></Link>)}</div></section>)}
  </main>;
}
