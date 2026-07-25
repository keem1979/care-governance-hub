import {
  Building2,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { requireAuthorisedContext } from "@/lib/auth/dal";

export default async function DashboardPage() {
  const context = await requireAuthorisedContext();
  const cards = [
    {
      label: "Organisation",
      value: context.organisation.name,
      detail: "Tenant context active",
      icon: Building2,
    },
    {
      label: "Service locations",
      value: String(context.locations.length),
      detail: context.allLocations ? "Access to all locations" : "Assigned access",
      icon: MapPin,
    },
    {
      label: "Your role",
      value: context.role.name,
      detail: `${context.permissions.length} permissions granted`,
      icon: Users,
    },
    {
      label: "Foundation status",
      value: "Milestone 1",
      detail: "Authentication and tenant controls active",
      icon: ShieldCheck,
    },
  ];

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">
            Governance overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Good {new Date().getHours() < 12 ? "morning" : "afternoon"},{" "}
            {context.user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-muted">
            Your secure foundation is ready. Compliance records arrive in later
            milestones.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-brand-dark">
          <CheckCircle2 aria-hidden="true" size={17} />
          Tenant controls active
        </span>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <article
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            key={label}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-brand">
              <Icon aria-hidden="true" size={20} />
            </span>
            <p className="mt-5 text-sm text-muted">{label}</p>
            <p className="mt-1 truncate text-xl font-semibold" title={value}>
              {value}
            </p>
            <p className="mt-2 text-xs text-muted">{detail}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Inspection readiness</h2>
          <div className="mt-8 rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center">
            <BarEmptyState />
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Foundation checks</h2>
          <ul className="mt-5 space-y-4 text-sm">
            {[
              "Secure session with expiry",
              "Server-side organisation scope",
              "Central role permissions",
              "Location assignments",
              "Immutable activity foundation",
            ].map((item) => (
              <li className="flex items-center gap-3" key={item}>
                <CheckCircle2 className="text-brand" size={18} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function BarEmptyState() {
  return (
    <>
      <p className="font-semibold">No compliance evidence recorded yet</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
        The readiness summary never invents data. Evidence, policies and audits
        will begin populating this view from Milestone 2 onward.
      </p>
    </>
  );
}
