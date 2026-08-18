import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { carePlanScopeWhere, carePlanStatusLabel } from "@/lib/care-plans";
import { clientName } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function CarePlansPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const query = await searchParams;
  const db = createDb();
  try {
    const plans = await db.carePlan.findMany({
      where: carePlanScopeWhere(context),
      include: {
        versions: { select: { id: true, status: true }, orderBy: { versionNumber: "desc" }, take: 2 },
        assignments: { where: { isActive: true }, select: { id: true } },
        acknowledgements: { select: { versionId: true } },
      },
      orderBy: [{ nextReviewDate: "asc" }, { updatedAt: "desc" }],
    });
    const clientIds = [...new Set(plans.map((plan) => plan.clientId))];
    const locationIds = [...new Set(plans.map((plan) => plan.locationId).filter(Boolean) as string[])];
    const userIds = [...new Set(plans.flatMap((plan) => [plan.careCoordinatorId, plan.registeredManagerId]).filter(Boolean) as string[])];
    const [clients, locations, users, openActions] = await Promise.all([
      db.client.findMany({ where: { id: { in: clientIds }, organisationId: context.organisation.id }, select: { id: true, firstName: true, lastName: true, preferredName: true, clientReference: true } }),
      db.serviceLocation.findMany({ where: { id: { in: locationIds }, organisationId: context.organisation.id }, select: { id: true, name: true } }),
      db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
      db.action.findMany({ where: { organisationId: context.organisation.id, id: { in: [...new Set(plans.flatMap((plan) => plan.linkedActionIds))] }, status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] } }, select: { id: true } }),
    ]);
    const clientById = new Map(clients.map((client) => [client.id, client]));
    const locationById = new Map(locations.map((location) => [location.id, location.name]));
    const userById = new Map(users.map((user) => [user.id, user.name]));
    const openActionIds = new Set(openActions.map((action) => action.id));
    const acknowledgedForCurrentVersion = (plan: (typeof plans)[number]) => plan.acknowledgements.filter((acknowledgement) => acknowledgement.versionId === plan.currentVersionId).length;
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 30);
    const metrics = [
      ["Active care plans", plans.filter((plan) => ["ACTIVE", "ACTIVE_WITH_ACTIONS"].includes(plan.status)).length],
      ["Reviews due", plans.filter((plan) => plan.nextReviewDate && plan.nextReviewDate >= now && plan.nextReviewDate <= soon).length],
      ["Reviews overdue", plans.filter((plan) => plan.nextReviewDate && plan.nextReviewDate < now).length],
      ["Awaiting publication", plans.filter((plan) => plan.status === "AWAITING_APPROVAL").length],
      ["High risks", plans.filter((plan) => plan.overallRisk === "HIGH").length],
      ["Critical risks", plans.filter((plan) => plan.overallRisk === "CRITICAL").length],
      ["Acknowledgements due", plans.reduce((total, plan) => total + Math.max(0, plan.assignments.length - acknowledgedForCurrentVersion(plan)), 0)],
      ["Plans with actions", plans.filter((plan) => plan.linkedActionIds.some((id) => openActionIds.has(id))).length],
    ] as const;
    const q = String(query.q ?? "").toLowerCase();
    const status = String(query.status ?? "");
    const risk = String(query.risk ?? "");
    const location = String(query.location ?? "");
    const authority = String(query.authority ?? "");
    const commissioner = String(query.commissioner ?? "");
    const personId = String(query.person ?? "");
    const review = String(query.review ?? "");
    const manager = String(query.manager ?? "");
    const coordinator = String(query.coordinator ?? "");
    const serviceType = String(query.serviceType ?? "");
    const filtered = plans.filter((plan) => {
      const person = clientById.get(plan.clientId);
      const reviewState = plan.nextReviewDate && plan.nextReviewDate < now ? "OVERDUE" : plan.nextReviewDate && plan.nextReviewDate <= soon ? "DUE" : "CURRENT";
      return (!q || `${person ? clientName(person) : ""} ${plan.reference} ${plan.localAuthorityName ?? ""} ${plan.commissioner ?? ""}`.toLowerCase().includes(q))
        && (!status || plan.status === status)
        && (!risk || plan.overallRisk === risk)
        && (!location || plan.locationId === location)
        && (!authority || plan.localAuthorityName === authority)
        && (!commissioner || plan.commissioner === commissioner)
        && (!personId || plan.clientId === personId)
        && (!review || reviewState === review)
        && (!manager || plan.registeredManagerId === manager)
        && (!coordinator || plan.careCoordinatorId === coordinator)
        && (!serviceType || plan.serviceType === serviceType);
    });
    const authorities = [...new Set(plans.map((plan) => plan.localAuthorityName).filter(Boolean) as string[])].sort();
    const commissioners = [...new Set(plans.map((plan) => plan.commissioner).filter(Boolean) as string[])].sort();
    const serviceTypes = [...new Set(plans.map((plan) => plan.serviceType).filter(Boolean) as string[])].sort();
    return <main className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Operational source of truth</p><h1 className="mt-1 text-3xl font-bold">CARE PLANS</h1><p className="mt-1 max-w-4xl text-slate-600">Create, manage and review person-centred care plans with controlled versioning and integrated Registered Manager assurance.</p></div>{hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT) ? <Link href="/care-plans/new" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white">+ New care plan</Link> : null}</header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, value]) => <article key={label} className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}</section>
      <form className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-3 xl:grid-cols-5">
        <input name="q" defaultValue={String(query.q ?? "")} placeholder="Search person, reference or commissioner" className="rounded-xl border p-2.5 text-sm"/>
        <Filter name="person" label="All people" initial={personId} options={clients.map((client) => [client.id, clientName(client)])}/>
        <Filter name="location" label="All service locations" initial={location} options={locations.map((item) => [item.id, item.name])}/>
        <Filter name="authority" label="All authorities" initial={authority} options={authorities.map((item) => [item, item])}/>
        <Filter name="commissioner" label="All commissioners" initial={commissioner} options={commissioners.map((item) => [item, item])}/>
        <Filter name="serviceType" label="All service types" initial={serviceType} options={serviceTypes.map((item) => [item, item])}/>
        <Filter name="status" label="All statuses" initial={status} options={["DRAFT", "AWAITING_PERSON_AGREEMENT", "AWAITING_CLINICAL_INFORMATION", "AWAITING_APPROVAL", "ACTIVE", "ACTIVE_WITH_ACTIONS", "REVIEW_DUE", "REVIEW_OVERDUE", "SUPERSEDED", "ARCHIVED"].map((item) => [item, carePlanStatusLabel(item)])}/>
        <Filter name="risk" label="All risks" initial={risk} options={["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((item) => [item, item])}/>
        <Filter name="review" label="All review states" initial={review} options={[["CURRENT", "Current"], ["DUE", "Due in 30 days"], ["OVERDUE", "Overdue"]]}/>
        <Filter name="manager" label="All Registered Managers" initial={manager} options={users.filter((user) => plans.some((plan) => plan.registeredManagerId === user.id)).map((user) => [user.id, userById.get(user.id) ?? "Manager"])}/>
        <Filter name="coordinator" label="All Care Coordinators" initial={coordinator} options={users.filter((user) => plans.some((plan) => plan.careCoordinatorId === user.id)).map((user) => [user.id, userById.get(user.id) ?? "Coordinator"])}/>
        <p className="self-center text-xs text-slate-500">Organisation: <strong>{context.organisation.name}</strong></p>
        <button className="rounded-xl bg-slate-900 p-2.5 text-sm font-bold text-white">Apply filters</button>
        <Link href="/care-plans" className="self-center text-center text-sm font-semibold text-emerald-800">Clear filters</Link>
      </form>
      {filtered.length ? <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-900 text-white"><tr>{["Person", "Reference", "Service", "Version", "Effective", "Next review", "Risk", "Open actions", "Staff acknowledged", "Status"].map((value) => <th key={value} className="p-3 text-xs uppercase">{value}</th>)}</tr></thead><tbody>{filtered.map((plan) => {
        const person = clientById.get(plan.clientId);
        const openCount = plan.linkedActionIds.filter((id) => openActionIds.has(id)).length;
        const acknowledged = acknowledgedForCurrentVersion(plan);
        const acknowledgementRate = plan.assignments.length ? Math.round(Math.min(plan.assignments.length, acknowledged) / plan.assignments.length * 100) : 100;
        return <tr key={plan.id} className="border-t hover:bg-emerald-50/40"><td className="p-3 font-bold">{person ? clientName(person) : "Person record unavailable"}</td><td className="p-3"><Link href={`/care-plans/${plan.id}`} className="font-mono font-bold text-emerald-800">{plan.reference}</Link></td><td className="p-3">{plan.locationId ? locationById.get(plan.locationId) : "Organisation"}</td><td className="p-3">v{plan.currentVersionNumber}</td><td className="p-3">{date(plan.effectiveDate)}</td><td className="p-3">{date(plan.nextReviewDate)}</td><td className="p-3"><Chip value={plan.overallRisk}/></td><td className="p-3">{openCount}</td><td className="p-3">{acknowledgementRate}%</td><td className="p-3"><Chip value={carePlanStatusLabel(plan.status)}/></td></tr>;
      })}</tbody></table></div> : <section className="rounded-2xl border border-dashed bg-white p-10 text-center"><h2 className="font-bold">No care plans match this view</h2><p className="mt-1 text-sm text-slate-500">Adjust the filters or create the person&apos;s first controlled care plan.</p></section>}
    </main>;
  } finally {
    await db.$disconnect();
  }
}

function Chip({ value }: { value: string }) {
  const critical = value.includes("CRITICAL") || value.includes("OVERDUE");
  const high = value.includes("HIGH") || value.includes("AWAITING");
  return <span className={`rounded-full px-2 py-1 text-xs font-bold ${critical ? "bg-red-100 text-red-800" : high ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{value}</span>;
}

function Filter({ name, label, initial, options }: { name: string; label: string; initial: string; options: string[][] }) {
  return <select name={name} defaultValue={initial} className="rounded-xl border p-2.5 text-sm"><option value="">{label}</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>;
}

function date(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }).format(value) : "Not set";
}
