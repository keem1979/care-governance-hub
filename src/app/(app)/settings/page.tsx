import {
  LicenceForm,
  LocationForm,
  MemberForm,
  NewLocationForm,
  NewMemberForm,
  OrganisationForm,
} from "@/components/settings-forms";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import {
  hasPermission,
  permissionLabel,
  PERMISSIONS,
} from "@/lib/permissions";

export default async function SettingsPage() {
  const context = await requireAnyPermission([
    PERMISSIONS.ORGANISATION_MANAGE,
    PERMISSIONS.MEMBERS_MANAGE,
    PERMISSIONS.LOCATIONS_MANAGE,
  ]);
  const db = createDb();

  try {
    const [organisation, locations, memberships, roles] = await Promise.all([
      db.organisation.findUniqueOrThrow({
        where: { id: context.organisation.id },
        select: {
          name: true,
          slug: true,
          isDemo: true,
          createdAt: true,
          licenceSeats: true,
          policyLogoFileName: true,
          policyLogoStorageKey: true,
        },
      }),
      db.serviceLocation.findMany({
        where: { organisationId: context.organisation.id },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      db.organisationMembership.findMany({
        where: { organisationId: context.organisation.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              lastLoginAt: true,
            },
          },
          role: {
            select: {
              name: true,
              key: true,
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
          permissions: {
            select: { permission: { select: { key: true } } },
          },
          locations: { select: { locationId: true } },
        },
        orderBy: { user: { name: "asc" } },
      }),
      db.role.findMany({
        where: { isSystem: true },
        include: {
          permissions: { include: { permission: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const canOrganisation = hasPermission(
      context.permissions,
      PERMISSIONS.ORGANISATION_MANAGE,
    );
    const canLocations = hasPermission(
      context.permissions,
      PERMISSIONS.LOCATIONS_MANAGE,
    );
    const canMembers = hasPermission(
      context.permissions,
      PERMISSIONS.MEMBERS_MANAGE,
    );
    const activeLocations = locations.filter((item) => item.isActive);
    const activeUsers = memberships.filter(
      (item) => item.status === "ACTIVE",
    ).length;
    const roleOptions = roles.map((role) => ({
      id: role.id,
      name: role.name,
      key: role.key,
      description: role.description,
      permissionKeys: role.permissions.map(({ permission }) => permission.key),
    }));
    const managerOptions = memberships
      .filter((membership) => membership.status === "ACTIVE")
      .map((membership) => ({
        id: membership.id,
        name: membership.user.name,
      }));

    return (
      <main className="space-y-8">
        <header>
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
            Administration
          </p>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 max-w-3xl text-slate-600">
            Manage your organisation structure, licence capacity and each
            person’s access. Ticked permissions grant access; unticked
            permissions block it.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-4">
          <Stat label="Active locations" value={activeLocations.length} />
          <Stat label="Active users" value={activeUsers} />
          <Stat label="Purchased licences" value={organisation.licenceSeats} />
          <Stat
            label="Available licences"
            value={Math.max(0, organisation.licenceSeats - activeUsers)}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold">Organisation</h2>
          <p className="mb-4 text-sm text-slate-500">
            Workspace: {organisation.slug} · Created{" "}
            {organisation.createdAt.toLocaleDateString("en-GB")}
            {organisation.isDemo ? " · Demonstration organisation" : ""}
          </p>
          {canOrganisation ? (
            <OrganisationForm name={organisation.name} logoFileName={organisation.policyLogoFileName} hasLogo={Boolean(organisation.policyLogoStorageKey)} />
          ) : (
            <p className="text-sm text-slate-600">
              You can view these settings but cannot change organisation
              details.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Subscription capacity
            </p>
            <h2 className="mt-1 text-2xl font-bold">User licences</h2>
            <p className="mt-1 text-sm text-slate-600">
              One active user uses one licence. Deactivated users retain their
              audit history without using a seat.
            </p>
          </div>
          <div className="mt-5">
            {canOrganisation ? (
              <LicenceForm
                seats={organisation.licenceSeats}
                activeUsers={activeUsers}
              />
            ) : (
              <p className="text-sm text-slate-600">
                Organisation administrators manage licence quantities.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Service locations</h2>
            <p className="text-sm text-slate-600">
              Archive locations instead of deleting their governance history.
            </p>
          </div>
          {canLocations ? (
            <details className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <summary className="cursor-pointer font-bold">
                Add service location
              </summary>
              <div className="mt-4">
                <NewLocationForm />
              </div>
            </details>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-2">
            {locations.map((location) => (
              <article
                key={location.id}
                className={`rounded-2xl border bg-white p-5 ${
                  location.isActive
                    ? "border-slate-200"
                    : "border-slate-300 opacity-70"
                }`}
              >
                <div className="mb-4 flex justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{location.name}</h3>
                    <p className="text-xs text-slate-500">{location.code}</p>
                  </div>
                  <span className="text-xs font-bold">
                    {location.isActive ? "Active" : "Archived"}
                  </span>
                </div>
                {canLocations ? (
                  <LocationForm location={location} />
                ) : (
                  <p className="text-sm">
                    {[location.addressLine1, location.town, location.postcode]
                      .filter(Boolean)
                      .join(", ") || "No address recorded"}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Users and access</h2>
            <p className="max-w-3xl text-sm text-slate-600">
              Assign a structural role, reporting line, location scope and
              individual permissions. Every change is recorded in the Activity
              Log.
            </p>
          </div>
          {canMembers ? (
            <details className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <summary className="cursor-pointer font-bold">Add user</summary>
              <div className="mt-5">
                <NewMemberForm
                  roles={roleOptions}
                  locations={activeLocations.map(({ id, name }) => ({ id, name }))}
                  managers={managerOptions}
                  availableLicences={organisation.licenceSeats - activeUsers}
                />
              </div>
            </details>
          ) : null}
          <div className="space-y-4">
            {memberships.map((membership) => {
              const permissionKeys = (
                membership.permissionOverridesEnabled
                  ? membership.permissions
                  : membership.role.permissions
              ).map(({ permission }) => permission.key);
              return (
                <article
                  key={membership.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  {canMembers ? (
                    <MemberForm
                      membership={{
                        id: membership.id,
                        user: membership.user,
                        roleId: membership.roleId,
                        status: membership.status,
                        accessMode: membership.accessMode,
                        jobTitle: membership.jobTitle,
                        department: membership.department,
                        reportsToId: membership.reportsToId,
                        allLocations: membership.allLocations,
                        locations: membership.locations,
                        permissionKeys,
                      }}
                      roles={roleOptions}
                      locations={activeLocations.map(({ id, name }) => ({
                        id,
                        name,
                      }))}
                      managers={managerOptions}
                      currentUserId={context.user.id}
                    />
                  ) : (
                    <div>
                      <h3 className="font-bold">{membership.user.name}</h3>
                      <p className="text-sm text-slate-500">
                        {membership.jobTitle || membership.role.name} ·{" "}
                        {membership.status}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Structural role presets</h2>
            <p className="text-sm text-slate-600">
              Selecting a role starts with these permissions. Administrators can
              then tailor the individual user above.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <article
                key={role.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <h3 className="font-bold">{role.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {role.description}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {role.permissions.map(({ permission }) => (
                    <li className="flex items-center gap-2" key={permission.id}>
                      <span
                        aria-hidden="true"
                        className="grid size-5 place-items-center rounded bg-emerald-100 text-xs font-black text-emerald-800"
                      >
                        ✓
                      </span>
                      {permissionLabel(permission.key)}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  } finally {
    await db.$disconnect();
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
