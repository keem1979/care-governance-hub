import Image from "next/image";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { CLIENT_STATUSES, clientLabel, clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const query = await searchParams;
  const q = String(query.q ?? "").trim();
  const status = String(query.status ?? "");
  const db = createDb();
  try {
    const base = clientScopeWhere(context);
    const clients = await db.client.findMany({
      where: {
        AND: [base, ...(q ? [{ OR: [
          { clientReference: { contains: q, mode: "insensitive" as const } },
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
          { preferredName: { contains: q, mode: "insensitive" as const } },
        ] }] : [])],
        ...(status ? { status: status as never } : {}),
      },
      include: { location: { select: { name: true } }, _count: { select: { registerEntries: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 300,
    });
    const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);

    return <main className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">People receiving support</p>
          <h1 className="text-3xl font-bold">Client Directory</h1>
          <p className="mt-1 max-w-3xl text-slate-600">Find a person once, then open their assessments, reviews, incidents and linked evidence from one profile.</p>
        </div>
        {canEdit ? <Link href="/clients/new" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Add client</Link> : null}
      </header>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[2fr_1fr_auto]">
        <input name="q" defaultValue={q} placeholder="Search name, client number or reference" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All client statuses</option>
          {CLIENT_STATUSES.map((item) => <option key={item} value={item}>{clientLabel(item)}</option>)}
        </select>
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>

      {clients.length ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Person</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Linked records</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{clients.map((person) => <tr key={person.id} className="hover:bg-slate-50">
              <td className="px-4 py-4"><div className="flex items-center gap-3">
                <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-xs font-bold text-emerald-800">
                  {person.profilePhotoKey ? <Image unoptimized fill className="object-cover" sizes="44px" src={`/api/clients/${person.id}/photo?v=${person.updatedAt.getTime()}`} alt="" /> : <span>{person.firstName[0]}{person.lastName[0]}</span>}
                </div>
                <div><Link href={`/clients/${person.id}`} className="font-bold text-emerald-800 hover:underline">{clientName(person)}</Link><p className="font-mono text-xs text-slate-500">Client {person.clientNumber} · {person.clientReference}</p></div>
              </div></td>
              <td className="px-4 py-4">{person.location?.name ?? "Organisation-wide"}</td>
              <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{clientLabel(person.status)}</span></td>
              <td className="px-4 py-4 font-semibold">{person._count.registerEntries}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section> : <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-bold">No client records found</h2><p className="mt-1 text-sm text-slate-600">Add the first client or change your search.</p></section>}
    </main>;
  } finally {
    await db.$disconnect();
  }
}
