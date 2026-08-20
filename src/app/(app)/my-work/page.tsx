import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Flag } from "lucide-react";
import { requireAnyPermission } from "@/lib/auth/dal";
import { filterMyWork, MY_WORK_VIEWS, myWorkUrgency, myWorkView, myWorkViewLabel, type MyWorkPriority, type MyWorkUrgency } from "@/lib/my-work";
import { getMyWorkData } from "@/lib/my-work-data";
import { PERMISSIONS } from "@/lib/permissions";

export default async function MyWorkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireAnyPermission([PERMISSIONS.ASSIGNED_TASKS_EDIT, PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.GOVERNANCE_VIEW]);
  const query = await searchParams;
  const view = myWorkView(query.view);
  const now = new Date();
  const { items } = await getMyWorkData(context);
  const visible = filterMyWork(items, view, now);
  const counts = Object.fromEntries(MY_WORK_VIEWS.map((value) => [value, value === "ALL" ? items.length : items.filter((item) => myWorkUrgency(item.targetAt, now) === value).length])) as Record<(typeof MY_WORK_VIEWS)[number], number>;

  return <main className="space-y-7">
    <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-800 p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-200">Personal execution workspace</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">My Work</h1><p className="mt-3 leading-7 text-emerald-50">Everything assigned to {context.user.name}, ordered by urgency and target date. Open the source record to update progress, add evidence or complete the work.</p></div>
        <div className="min-w-56 rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-xs uppercase tracking-wide text-emerald-200">Accountable role</p><p className="mt-1 font-bold">{context.role.name}</p><p className="mt-2 text-sm text-emerald-100">Only work personally owned by this login appears here.</p></div>
      </div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Work status summary">
      <Summary href="/my-work" label="All assigned" value={counts.ALL} icon={ClipboardList}/>
      <Summary href="/my-work?view=OVERDUE" label="Overdue" value={counts.OVERDUE} icon={AlertTriangle} alert={counts.OVERDUE > 0}/>
      <Summary href="/my-work?view=DUE_SOON" label="Due in 7 days" value={counts.DUE_SOON} icon={CalendarClock}/>
      <Summary href="/my-work?view=UPCOMING" label="Later targets" value={counts.UPCOMING} icon={CheckCircle2}/>
      <Summary href="/my-work?view=NEEDS_TARGET" label="Needs a target" value={counts.NEEDS_TARGET} icon={Flag} alert={counts.NEEDS_TARGET > 0}/>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">To-do list</p><h2 className="mt-1 text-2xl font-black">{myWorkViewLabel(view)}</h2><p className="mt-1 text-sm text-slate-600">Overdue work is always placed first. A missing target is shown explicitly and should be corrected by the assigning manager.</p></div><nav className="flex flex-wrap gap-2" aria-label="Filter my work">{MY_WORK_VIEWS.map((item) => <Link key={item} href={item === "ALL" ? "/my-work" : `/my-work?view=${item}`} className={`rounded-full px-3 py-2 text-xs font-bold ${view === item ? "bg-emerald-800 text-white" : "border border-slate-300 text-slate-700 hover:border-emerald-500"}`}>{myWorkViewLabel(item)} · {counts[item]}</Link>)}</nav></div>

      <div className="mt-6 space-y-3">
        {visible.length ? visible.map((item) => {
          const urgency = myWorkUrgency(item.targetAt, now);
          return <article key={item.key} className={`rounded-2xl border p-4 sm:p-5 ${urgency === "OVERDUE" ? "border-red-300 bg-red-50/50" : urgency === "DUE_SOON" ? "border-amber-300 bg-amber-50/40" : urgency === "NEEDS_TARGET" ? "border-violet-300 bg-violet-50/40" : "border-slate-200"}`}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white">{item.source}</span><Priority value={item.priority}/><span className="text-xs font-semibold text-slate-500">{item.reference}</span></div><h3 className="mt-2 text-lg font-black text-slate-950">{item.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.detail}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{item.locationName}</span>{item.clientName ? <span>Person: {item.clientName}</span> : null}<span>Status: {label(item.state)}</span></div></div>
              <div className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Target</p><p className={`mt-1 font-black ${urgency === "OVERDUE" ? "text-red-800" : urgency === "DUE_SOON" ? "text-amber-900" : urgency === "NEEDS_TARGET" ? "text-violet-800" : "text-slate-900"}`}>{item.targetAt ? date(item.targetAt) : "Target not set"}</p><p className="mt-1 text-xs text-slate-600">{urgencyLabel(urgency, item.targetAt, now)}</p></div>
              <Link href={item.href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900">Open work <ArrowRight size={16}/></Link>
            </div>
          </article>;
        }) : <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-700"/><h3 className="mt-3 font-black">Nothing in this part of your worklist</h3><p className="mt-1 text-sm text-slate-600">Choose another filter or ask your manager to check that the work has been assigned to your login.</p></div>}
      </div>
    </section>

  </main>;
}

function Summary({ href, label: text, value, icon: Icon, alert = false }: { href: string; label: string; value: number; icon: typeof ClipboardList; alert?: boolean }) { return <Link href={href} className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${alert ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}><Icon className={alert ? "text-amber-800" : "text-emerald-700"} size={20}/><p className="mt-3 text-3xl font-black">{value}</p><p className="text-sm font-semibold text-slate-600">{text}</p></Link>; }
function Priority({ value }: { value: MyWorkPriority }) { const style = value === "CRITICAL" ? "bg-red-100 text-red-800" : value === "HIGH" ? "bg-amber-100 text-amber-900" : value === "LOW" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"; return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${style}`}>{label(value)}</span>; }
function date(value: Date) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(value); }
function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()); }
function urgencyLabel(value: MyWorkUrgency, target: Date | null, now: Date) { if (value === "NEEDS_TARGET") return "Manager action: add a clear target"; if (!target) return "Target not set"; const days = Math.ceil((target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000); if (value === "OVERDUE") return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`; if (value === "DUE_SOON") return days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"} remaining`; return "Planned work"; }
