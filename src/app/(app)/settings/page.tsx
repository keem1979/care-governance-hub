import { MemberForm, NewLocationForm, NewMemberForm, OrganisationForm, LocationForm } from "@/components/settings-forms";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function SettingsPage() {
  const context = await requireAnyPermission([PERMISSIONS.ORGANISATION_MANAGE, PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.LOCATIONS_MANAGE]);
  const db = createDb();
  try {
    const [organisation, locations, memberships, roles] = await Promise.all([
      db.organisation.findUniqueOrThrow({ where: { id: context.organisation.id }, select: { name: true, slug: true, isDemo: true, createdAt: true } }),
      db.serviceLocation.findMany({ where: { organisationId: context.organisation.id }, orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id }, include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } }, role: { select: { name: true, key: true } }, locations: { select: { locationId: true } } }, orderBy: { user: { name: "asc" } } }),
      db.role.findMany({ where: { isSystem: true }, include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } }),
    ]);
    const canOrganisation = hasPermission(context.permissions, PERMISSIONS.ORGANISATION_MANAGE);
    const canLocations = hasPermission(context.permissions, PERMISSIONS.LOCATIONS_MANAGE);
    const canMembers = hasPermission(context.permissions, PERMISSIONS.MEMBERS_MANAGE);
    const activeLocations = locations.filter((item) => item.isActive);
    return <main className="space-y-8">
      <header><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Administration</p><h1 className="text-3xl font-bold">Settings</h1><p className="mt-1 text-slate-600">Manage organisation details, service locations, users and access controls.</p></header>
      <section className="grid gap-4 sm:grid-cols-3"><Stat label="Active locations" value={activeLocations.length}/><Stat label="Active users" value={memberships.filter((item) => item.status === "ACTIVE").length}/><Stat label="Available roles" value={roles.length}/></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">Organisation</h2><p className="mb-4 text-sm text-slate-500">Workspace: {organisation.slug} · Created {organisation.createdAt.toLocaleDateString("en-GB")}{organisation.isDemo ? " · Demonstration organisation" : ""}</p>{canOrganisation ? <OrganisationForm name={organisation.name}/> : <p className="text-sm text-slate-600">You can view these settings but cannot change organisation details.</p>}</section>
      <section className="space-y-4"><div><h2 className="text-2xl font-bold">Service locations</h2><p className="text-sm text-slate-600">Archive locations instead of deleting their governance history.</p></div>{canLocations ? <details className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><summary className="cursor-pointer font-bold">Add service location</summary><div className="mt-4"><NewLocationForm/></div></details> : null}<div className="grid gap-4 xl:grid-cols-2">{locations.map((location) => <article key={location.id} className={`rounded-2xl border bg-white p-5 ${location.isActive ? "border-slate-200" : "border-slate-300 opacity-70"}`}><div className="mb-4 flex justify-between gap-3"><div><h3 className="font-bold">{location.name}</h3><p className="text-xs text-slate-500">{location.code}</p></div><span className="text-xs font-bold">{location.isActive ? "Active" : "Archived"}</span></div>{canLocations ? <LocationForm location={location}/> : <p className="text-sm">{[location.addressLine1, location.town, location.postcode].filter(Boolean).join(", ") || "No address recorded"}</p>}</article>)}</div></section>
      <section className="space-y-4"><div><h2 className="text-2xl font-bold">Users and access</h2><p className="text-sm text-slate-600">Role and location changes are recorded in the Activity Log.</p></div>{canMembers ? <details className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><summary className="cursor-pointer font-bold">Add user</summary><div className="mt-4"><NewMemberForm roles={roles.map(({ id, name, key }) => ({ id, name, key }))} locations={activeLocations.map(({ id, name }) => ({ id, name }))}/></div></details> : null}<div className="grid gap-4 xl:grid-cols-2">{memberships.map((membership) => <article key={membership.id} className="rounded-2xl border border-slate-200 bg-white p-5">{canMembers ? <MemberForm membership={membership} roles={roles.map(({ id, name, key }) => ({ id, name, key }))} locations={activeLocations.map(({ id, name }) => ({ id, name }))} currentUserId={context.user.id}/> : <div><h3 className="font-bold">{membership.user.name}</h3><p className="text-sm text-slate-500">{membership.role.name} · {membership.status}</p></div>}</article>)}</div></section>
      <section className="space-y-4"><div><h2 className="text-2xl font-bold">Role permissions</h2><p className="text-sm text-slate-600">System roles are centrally defined and cannot be edited from this MVP screen.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.map((role) => <article key={role.id} className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold">{role.name}</h3><ul className="mt-3 space-y-1 text-sm text-slate-600">{role.permissions.map(({ permission }) => <li key={permission.id}>• {permission.description}</li>)}</ul></article>)}</div></section>
    </main>;
  } finally { await db.$disconnect(); }
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>; }
