import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { requirePermission } from "@/lib/auth/dal";
import { listActionSources } from "@/lib/action-sources";
import { clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";

const OVERSIGHT_ROLES = new Set<string>([
  ROLE_KEYS.REGISTERED_MANAGER,
  ROLE_KEYS.OWNER,
  ROLE_KEYS.NOMINATED_INDIVIDUAL,
  ROLE_KEYS.QUALITY_MANAGER,
]);

export default async function NewActionPage({ searchParams }: { searchParams: Promise<{ sourceType?: string; sourceId?: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE);
  const query = await searchParams;
  const db = createDb();
  try {
    const [memberships, clients, evidence, sources] = await Promise.all([
      db.organisationMembership.findMany({
        where: { organisationId: context.organisation.id, status: "ACTIVE" },
        select: { user: { select: { id: true, name: true } }, role: { select: { key: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      }),
      db.client.findMany({
        where: clientScopeWhere(context),
        select: { id: true, firstName: true, lastName: true, preferredName: true, clientReference: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 300,
      }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
      listActionSources(db, context),
    ]);
    const requested = query.sourceType && query.sourceId ? `${query.sourceType}:${query.sourceId}` : undefined;
    const preselected = requested && sources.some((item) => `${item.type}:${item.id}` === requested) ? requested : undefined;
    const oversight = memberships.filter((item) => OVERSIGHT_ROLES.has(item.role.key));
    const oversightOptions = (oversight.length ? oversight : memberships).map((item) => ({ id: item.user.id, name: `${item.user.name} · ${item.role.name}` }));

    return <main className="mx-auto max-w-5xl space-y-5">
      <div><Link href="/actions" className="text-sm font-semibold text-emerald-700">← Action Tracker</Link><h1 className="mt-2 text-3xl font-bold">Create improvement action</h1><p className="mt-1 text-slate-600">Create one accountable record that remains connected to its source, delivery owner, Registered Manager oversight, evidence, calendar and reports.</p></div>
      <ActionForm
        locations={context.locations.map(({ id, name }) => ({ id, name }))}
        owners={memberships.map(({ user }) => user)}
        oversightOwners={oversightOptions}
        clients={clients.map((client) => ({ id: client.id, name: `${client.clientReference} · ${clientName(client)}` }))}
        evidence={evidence.map(({ id, title }) => ({ id, name: title }))}
        sources={sources}
        preselectedSource={preselected}
      />
    </main>;
  } finally {
    await db.$disconnect();
  }
}
