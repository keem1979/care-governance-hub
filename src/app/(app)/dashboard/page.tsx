import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  Clock3,
  FilePlus2,
  ListPlus,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { getDashboardCounts, getRecentDashboardActivity } from "@/lib/dashboard-data";
import {
  dashboardModules,
  dashboardSummaries,
  reportingMonth,
} from "@/lib/dashboard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

const activityLabels: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  ARCHIVE: "Archived",
  RESTORE: "Restored",
  LOGIN: "Signed in",
  LOGIN_FAILED: "Sign-in attempt",
  LOGOUT: "Signed out",
  PERMISSION_CHANGE: "Permissions changed",
};

export default async function DashboardPage() {
  const context = await requireAuthorisedContext();
  const [recentActivity, counts] = await Promise.all([getRecentDashboardActivity(context), getDashboardCounts(context)]);
  const summaries = dashboardSummaries(counts);
  const modules = dashboardModules();
  const canEdit = hasPermission(
    context.permissions,
    PERMISSIONS.GOVERNANCE_EDIT,
  );
  const canUpload = hasPermission(
    context.permissions,
    PERMISSIONS.EVIDENCE_UPLOAD,
  );
  const canManageActions = hasPermission(
    context.permissions,
    PERMISSIONS.ACTIONS_MANAGE,
  );

  const quickActions = [
    {
      label: "Upload evidence",
      href: "/evidence/new",
      icon: Upload,
      visible: canUpload,
    },
    {
      label: "Add policy",
      href: "/policies/new",
      icon: FilePlus2,
      visible: canEdit,
    },
    {
      label: "Start audit",
      href: "/audits/new",
      icon: CircleGauge,
      visible: hasPermission(
        context.permissions,
        PERMISSIONS.AUDITS_COMPLETE,
      ),
    },
    {
      label: "Add risk",
      href: "/risks/new",
      icon: ShieldCheck,
      visible: canEdit,
    },
    {
      label: "Create action",
      href: "/actions",
      icon: ListPlus,
      visible: canManageActions,
    },
    {
      label: "Schedule meeting",
      href: "/meetings",
      icon: CalendarDays,
      visible: canEdit,
    },
  ].filter(({ visible }) => visible);

  return (
    <div className="mx-auto max-w-[1480px]">
      <section className="overflow-hidden rounded-3xl bg-brand-dark text-white shadow-sm">
        <div className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.16em] text-emerald-100/75 uppercase">
              <span>Governance overview</span>
              <span aria-hidden="true">•</span>
              <span>{reportingMonth(new Date())}</span>
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Good {new Date().getHours() < 12 ? "morning" : "afternoon"},{" "}
              {context.user.name.split(" ")[0]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/75 sm:text-base">
              A single view of evidence, risk and actions for{" "}
              {context.organisation.name}.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                <MapPin aria-hidden="true" size={14} />
                {context.locations[0]?.name ?? "All locations"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                <ShieldCheck aria-hidden="true" size={14} />
                {context.role.name}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatusTile
              label="Readiness status"
              value="Not yet assessed"
              detail="No official CQC rating"
            />
            <StatusTile
              label="Overall completion"
              value="No data"
              detail="Calculated as modules are added"
            />
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="attention-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-brand uppercase">
              Attention summary
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              id="attention-heading"
            >
              What needs attention
            </h2>
          </div>
          <p className="hidden text-sm text-muted sm:block">
            Live counts appear as each module is completed.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaries.map(({ label, href, icon: Icon, value, qualifier }) => (
            <Link
              className="group rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              href={href}
              key={label}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-accent group-hover:text-brand">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand"
                  size={17}
                />
              </div>
              <p className="mt-4 text-2xl font-semibold">
                {value === null ? "—" : value}
              </p>
              <p className="mt-1 min-h-10 text-sm font-medium leading-5">
                {label}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">{qualifier}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section
          className="rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="compliance-heading"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-brand uppercase">
                Compliance by module
              </p>
              <h2 className="mt-1 text-xl font-semibold" id="compliance-heading">
                Evidence position
              </h2>
            </div>
            <BarChart3 aria-hidden="true" className="text-brand" size={23} />
          </div>
          <div className="mt-5 divide-y divide-border">
            {modules.map((module) => (
              <Link
                className="group grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                href={module.href}
                key={module.name}
              >
                <div>
                  <p className="font-semibold group-hover:text-brand">
                    {module.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">{module.description}</p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                    module.status === "ready"
                      ? "bg-accent text-brand-dark"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {module.status === "ready" ? "Controls active" : "Not started"}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="activity-heading"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-brand uppercase">
                Audit trail
              </p>
              <h2 className="mt-1 text-xl font-semibold" id="activity-heading">
                Recent activity
              </h2>
            </div>
            <Activity aria-hidden="true" className="text-brand" size={23} />
          </div>
          {recentActivity.length > 0 ? (
            <ol className="mt-5 space-y-1">
              {recentActivity.map((entry) => (
                <li
                  className="grid grid-cols-[auto_1fr] gap-3 rounded-xl px-2 py-3 hover:bg-background"
                  key={entry.id}
                >
                  <span className="mt-1 grid size-8 place-items-center rounded-full bg-accent text-brand">
                    <CheckCircle2 aria-hidden="true" size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-medium">{entry.summary}</p>
                      <time
                        className="text-xs text-muted"
                        dateTime={entry.createdAt}
                      >
                        {new Intl.DateTimeFormat("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/London",
                        }).format(new Date(entry.createdAt))}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {activityLabels[entry.action] ?? entry.action}
                      {entry.userName ? ` by ${entry.userName}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={Activity}
              title="No activity recorded"
              detail="Security and governance events will appear here."
            />
          )}
          <Link
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
            href="/activity"
          >
            View full activity log
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <DashboardEmptyPanel
          icon={Clock3}
          title="Upcoming deadlines"
          detail="No deadlines recorded. Due dates will appear when policies, evidence and meetings are added."
        />
        <DashboardEmptyPanel
          icon={ListPlus}
          title="Overdue actions"
          detail="No data recorded. Actions will appear when the Action Tracker is built."
        />
        <DashboardEmptyPanel
          icon={BarChart3}
          title="Audit completion trend"
          detail="No data recorded. The trend will use completed audit results."
        />
      </div>

      <section
        className="mt-6 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="quick-actions-heading"
      >
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-brand uppercase">
              Shortcuts
            </p>
            <h2 className="mt-1 text-xl font-semibold" id="quick-actions-heading">
              Quick actions
            </h2>
          </div>
          <p className="text-sm text-muted">
            Access follows your organisation role and permissions.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {quickActions.map(({ label, href, icon: Icon }) => (
            <Link
              className="group flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-4 font-semibold transition hover:border-emerald-300 hover:bg-accent"
              href={href}
              key={label}
            >
              <span className="flex items-center gap-3">
                <Icon aria-hidden="true" className="text-brand" size={19} />
                <span className="text-sm">{label}</span>
              </span>
              <Plus
                aria-hidden="true"
                className="text-slate-300 group-hover:text-brand"
                size={17}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-36 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs text-emerald-100/70">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-emerald-100/65">{detail}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Sparkles;
  title: string;
  detail: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-background px-5 py-8 text-center">
      <Icon aria-hidden="true" className="mx-auto text-slate-400" size={24} />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted">
        {detail}
      </p>
    </div>
  );
}

function DashboardEmptyPanel({
  icon,
  title,
  detail,
}: {
  icon: typeof Sparkles;
  title: string;
  detail: string;
}) {
  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-sm">
      <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
        {(() => {
          const Icon = icon;
          return <Icon aria-hidden="true" size={19} />;
        })()}
      </span>
      <h2 className="mt-5 font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </section>
  );
}
