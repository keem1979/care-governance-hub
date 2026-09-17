import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CircleGauge,
  ListPlus,
  MapPin,
  NotebookTabs,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { UkDashboardClock } from "@/components/uk-dashboard-clock";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { getDashboardCounts, getRecentDashboardActivity } from "@/lib/dashboard-data";
import { dashboardSummaries, type DashboardSummary } from "@/lib/dashboard";
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
  const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
  const canUpload = hasPermission(context.permissions, PERMISSIONS.EVIDENCE_UPLOAD);
  const canManageActions = hasPermission(context.permissions, PERMISSIONS.ACTIONS_MANAGE);
  const active = summaries.filter((item) => (item.value ?? 0) > 0 && !["Open complaints", "Open safeguarding matters"].includes(item.label));
  const immediate = active.filter((item) => /critical safeguarding|immediate safety|high-risk action/i.test(item.label));
  const overdue = active.filter((item) => /overdue|due for review|policies due|checks due|expiring/i.test(item.label) && !immediate.includes(item));
  const assurance = active.filter((item) => /awaiting assurance|reopened|requiring action|incidents awaiting|inspection requirements|competency actions/i.test(item.label) && !immediate.includes(item) && !overdue.includes(item));
  const upcoming = active.filter((item) => !immediate.includes(item) && !overdue.includes(item) && !assurance.includes(item));

  const quickActions = [
    { label: "Record incident", href: "/registers/incidents/new", icon: Activity, visible: canEdit },
    { label: "Record complaint", href: "/registers/complaints/new", icon: NotebookTabs, visible: canEdit },
    { label: "Record safeguarding", href: "/registers/safeguarding/new", icon: ShieldAlert, visible: canEdit },
    { label: "Create action", href: "/actions/new", icon: ListPlus, visible: canManageActions },
    { label: "Link evidence", href: "/evidence/new", icon: Upload, visible: canUpload },
    { label: "Start audit", href: "/audits/new", icon: CircleGauge, visible: hasPermission(context.permissions, PERMISSIONS.AUDITS_COMPLETE) },
  ].filter(({ visible }) => visible);

  return (
    <main className="mx-auto max-w-[1440px] space-y-6">
      <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">Management command centre</p>
            <UkDashboardClock firstName={context.user.name.split(" ")[0]} initialTime={new Date().toISOString()} />
            <h1 className="mt-4 max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">What requires management attention today?</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-emerald-50/80">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><MapPin aria-hidden="true" size={15} />{context.locations[0]?.name ?? "All authorised locations"}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><ShieldCheck aria-hidden="true" size={15} />{context.role.name}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 lg:max-w-xs">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-200">Exception position</p>
            <p className="mt-2 text-lg font-bold">{active.length ? `${active.length} areas need review` : "No active exceptions found"}</p>
            <p className="mt-1 text-sm leading-6 text-emerald-50/75">Counts may overlap where one record has more than one governance gap. Open the source record for the decision.</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="quick-actions-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[.14em] text-emerald-700">Start work</p><h2 className="mt-1 text-lg font-black" id="quick-actions-heading">Quick capture and follow-up</h2></div>
          <div className="flex flex-wrap gap-2">{quickActions.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:border-emerald-500 hover:bg-emerald-50"><Icon aria-hidden="true" size={17} className="text-emerald-700" />{label}</Link>)}</div>
        </div>
      </section>

      {active.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <AttentionGroup title="Immediate attention" detail="Safety and high-severity matters come first." items={immediate} tone="critical" empty="No immediate safety or Critical exceptions are currently surfaced." />
          <AttentionGroup title="Overdue" detail="Deadlines and reviews already beyond their recorded date." items={overdue} tone="overdue" empty="No overdue exception is currently surfaced." />
          <AttentionGroup title="Awaiting decision or assurance" detail="Work has reached a management judgement point or needs follow-up." items={assurance} tone="assurance" empty="No item is currently waiting for assurance." />
          <AttentionGroup title="Upcoming and monitoring" detail="Important work approaching its review or evidence point." items={upcoming} tone="upcoming" empty="No additional upcoming exception is currently surfaced." />
        </div>
      ) : (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950">
          <h2 className="font-black">No active management exception is currently surfaced</h2>
          <p className="mt-1 text-sm leading-6">This is not a compliance conclusion. Continue routine review, evidence gathering and professional oversight.</p>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="activity-heading">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.14em] text-emerald-700">Audit trail</p><h2 className="mt-1 text-xl font-black" id="activity-heading">Recent governed activity</h2></div><Activity aria-hidden="true" className="text-emerald-700" size={22} /></div>
          {recentActivity.length ? <ol className="mt-4 divide-y divide-slate-200">{recentActivity.map((entry) => <li className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto]" key={entry.id}><div><p className="font-semibold text-slate-950">{entry.summary}</p><p className="mt-1 text-xs text-slate-500">{activityLabels[entry.action] ?? entry.action}{entry.userName ? ` by ${entry.userName}` : ""}</p></div><time className="text-xs text-slate-500" dateTime={entry.createdAt}>{new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(entry.createdAt))}</time></li>)}</ol> : <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">Recent governed changes will appear here.</p>}
          <Link href="/activity" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline">Open audit trail <ArrowRight aria-hidden="true" size={15} /></Link>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">Current scope</p>
          <h2 className="mt-1 text-xl font-black">Open record context</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Position label="Open complaints" value={counts.openComplaints} href="/registers/complaints" />
            <Position label="Open safeguarding matters" value={counts.openSafeguarding} href="/registers/safeguarding" />
            <Position label="Incidents awaiting review" value={counts.incidentsAwaitingReview} href="/registers/incidents" />
            <Position label="Overdue central Actions" value={counts.overdueActions} href="/actions?view=OVERDUE" />
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-500">Context totals support workload awareness; exception rows above determine what needs attention first.</p>
        </aside>
      </div>
    </main>
  );
}

function AttentionGroup({ title, detail, items, tone, empty }: { title: string; detail: string; items: DashboardSummary[]; tone: "critical" | "overdue" | "assurance" | "upcoming"; empty: string }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-3"><span className={`size-2.5 rounded-full ${tone === "critical" ? "bg-red-600" : tone === "overdue" ? "bg-amber-600" : tone === "assurance" ? "bg-violet-600" : "bg-emerald-600"}`} aria-hidden="true" /><div><h2 className="font-black">{title}</h2><p className="mt-0.5 text-sm text-slate-600">{detail}</p></div></div></div>{items.length ? <div className="divide-y divide-slate-200">{items.map(({ label, href, icon: Icon, value, qualifier }) => <Link href={href} key={label} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-5 py-4 transition hover:bg-slate-50"><span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon aria-hidden="true" size={18} /></span><span><strong className="block text-sm text-slate-950">{label}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{qualifier}</span></span><span className="flex items-center gap-2"><strong className="text-xl text-slate-950">{value}</strong><ArrowRight aria-hidden="true" size={16} className="text-slate-400 group-hover:text-emerald-700" /></span></Link>)}</div> : <p className="px-5 py-5 text-sm text-slate-500">{empty}</p>}</section>;
}

function Position({ label, value, href }: { label: string; value: number; href: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><dt><Link href={href} className="font-semibold text-slate-800 hover:text-emerald-800">{label}</Link></dt><dd className="text-lg font-black">{value}</dd></div>;
}
