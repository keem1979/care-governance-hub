import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { GovernanceWorklist, QuickViewNav, type GovernanceWorklistItem, type WorklistTone } from "@/components/governance-experience";
import { requireAnyPermission } from "@/lib/auth/dal";
import { ACTION_PRIORITIES, ACTION_STATUSES, actionDaysRemaining, actionLabel, actionScopeWhere, effectiveActionStatus, sourcePath } from "@/lib/actions";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const PAGE_SIZE = 20;
const VIEWS = ["ATTENTION", "MINE", "OVERDUE", "DUE_SOON", "VERIFICATION", "EFFECTIVENESS", "CLOSURE", "HIGH_CRITICAL", "ALL"] as const;
type ActionView = (typeof VIEWS)[number];

export default async function ActionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ASSIGNED_TASKS_EDIT, PERMISSIONS.ACTIONS_MANAGE]);
  const query = await searchParams;
  const requestedView = field(query, "view");
  const view: ActionView = VIEWS.includes(requestedView as ActionView) ? requestedView as ActionView : "ATTENTION";
  const q = field(query, "q"), status = field(query, "status"), priority = field(query, "priority"), owner = field(query, "owner"), location = field(query, "location"), clientId = field(query, "clientId"), staffMemberId = field(query, "staffMemberId");
  const page = Math.max(1, Number(field(query, "page")) || 1), now = new Date(), db = createDb();
  try {
    const base: Prisma.ActionWhereInput = { AND: [actionScopeWhere(context), clientId ? { clientId } : {}, staffMemberId ? { staffMemberId } : {}] };
    const advanced: Prisma.ActionWhereInput = {
      ...(status ? { status: status as never } : {}), ...(priority ? { priority: priority as never } : {}), ...(owner ? { ownerId: owner } : {}), ...(location ? { locationId: location } : {}),
      ...(q ? { OR: [{ reference: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { sourceReference: { contains: q, mode: "insensitive" } }] } : {}),
    };
    const where: Prisma.ActionWhereInput = { AND: [base, viewWhere(view, context.user.id, now), advanced] };
    const countFor = (item: ActionView) => db.action.count({ where: { AND: [base, viewWhere(item, context.user.id, now)] } });
    const [actions, total, attention, overdue, dueSoon, verification, effectiveness, closure, highCritical, actionOwners] = await Promise.all([
      db.action.findMany({
        where,
        include: {
          owner: { select: { name: true } }, oversightOwner: { select: { name: true } }, location: { select: { name: true } }, client: { select: { firstName: true, lastName: true } }, staffMember: { select: { firstName: true, lastName: true } },
          updates: { orderBy: { createdAt: "desc" }, take: 1, select: { nextStep: true, blocker: true } },
          externalDependencies: { where: { status: { notIn: ["RESOLVED", "CANCELLED"] } }, orderBy: { dueDate: "asc" }, take: 1, select: { partyName: true, dueDate: true } },
          _count: { select: { evidenceLinks: { where: { retiredAt: null } }, occurrences: true } },
        },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { updatedAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      }),
      db.action.count({ where }), countFor("ATTENTION"), countFor("OVERDUE"), countFor("DUE_SOON"), countFor("VERIFICATION"), countFor("EFFECTIVENESS"), countFor("CLOSURE"), countFor("HIGH_CRITICAL"),
      db.action.findMany({ where: base, distinct: ["ownerId"], select: { owner: { select: { id: true, name: true } } }, orderBy: { ownerId: "asc" } }),
    ]);
    const canManage = hasPermission(context.permissions, PERMISSIONS.ACTIONS_MANAGE), pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const counts: Record<ActionView, number | undefined> = { ATTENTION: attention, MINE: undefined, OVERDUE: overdue, DUE_SOON: dueSoon, VERIFICATION: verification, EFFECTIVENESS: effectiveness, CLOSURE: closure, HIGH_CRITICAL: highCritical, ALL: undefined };
    const items: GovernanceWorklistItem[] = actions.map((action) => actionWorklistItem(action, now));
    const input = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";

    return <main className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">Actions &amp; improvement</p><h1 className="mt-1 text-3xl font-black text-slate-950">What needs action now?</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Prioritised by deadline, seriousness and the next governed decision. Completion, verification, effectiveness and closure remain separate.</p></div>{canManage ? <Link href="/actions/new" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900">Create action</Link> : null}</div></header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Action exceptions"><Stat href={actionViewHref("ATTENTION", clientId, staffMemberId)} label="Needs attention" value={attention} /><Stat href={actionViewHref("OVERDUE", clientId, staffMemberId)} label="Overdue" value={overdue} warn={overdue > 0} /><Stat href={actionViewHref("VERIFICATION", clientId, staffMemberId)} label="Awaiting verification" value={verification} /><Stat href={actionViewHref("EFFECTIVENESS", clientId, staffMemberId)} label="Effectiveness due" value={effectiveness} /><Stat href={actionViewHref("CLOSURE", clientId, staffMemberId)} label="Ready for closure" value={closure} /></section>

      <section className="space-y-4" aria-label="Action work views"><div className="flex flex-wrap items-end justify-between gap-3"><QuickViewNav active={view} defaultKey="ATTENTION" preserve={{ clientId, staffMemberId }} items={VIEWS.map((key) => ({ key, label: viewLabel(key), count: key === "MINE" || key === "ALL" ? undefined : counts[key] }))} /><div className="flex gap-2"><Link href="/api/actions/export?format=csv" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Export CSV</Link><Link href="/actions/report" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Print report</Link></div></div>
        <form className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end"><input type="hidden" name="view" value={view} />{clientId ? <input type="hidden" name="clientId" value={clientId} /> : null}{staffMemberId ? <input type="hidden" name="staffMemberId" value={staffMemberId} /> : null}<label className="flex-1 text-sm font-bold text-slate-700">Find an action<input name="q" defaultValue={q} placeholder="Title, reference or source" className={`${input} mt-1 w-full`} /></label><button className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Search</button><details className="group rounded-xl border border-slate-300 bg-white px-3 py-2 lg:min-w-48"><summary className="cursor-pointer list-none text-sm font-bold text-slate-700">More filters</summary><div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2 lg:absolute lg:right-6 lg:z-30 lg:w-[42rem] lg:rounded-2xl lg:border lg:bg-white lg:p-4 lg:shadow-xl"><select name="status" defaultValue={status} className={input}><option value="">All action statuses</option>{ACTION_STATUSES.filter((item) => item !== "ARCHIVED").map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select><select name="priority" defaultValue={priority} className={input}><option value="">All priorities</option>{ACTION_PRIORITIES.map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select><select name="location" defaultValue={location} className={input}><option value="">All locations</option>{context.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="owner" defaultValue={owner} className={input}><option value="">All delivery owners</option>{actionOwners.map(({ owner: item }) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white">Apply filters</button><Link href={`/actions?view=${view}${clientId ? `&clientId=${clientId}` : ""}${staffMemberId ? `&staffMemberId=${staffMemberId}` : ""}`} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-bold">Clear filters</Link></div></details></form>
      </section>

      {items.length ? <GovernanceWorklist items={items} /> : <section className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center"><h2 className="font-black">{view === "ATTENTION" ? "No Actions require management attention" : "No Actions match this view"}</h2><p className="mt-1 text-sm text-slate-600">{q || status || priority || owner || location ? "Clear the search or filters to widen the view." : "Choose another quick view or create a new improvement Action."}</p></section>}
      <nav className="flex items-center justify-between text-sm" aria-label="Action pages"><span>Page {page} of {pages}</span><div className="flex gap-2">{page > 1 ? <Link href={withPage(query, page - 1)} className="rounded-lg border bg-white px-3 py-2">Previous</Link> : null}{page < pages ? <Link href={withPage(query, page + 1)} className="rounded-lg border bg-white px-3 py-2">Next</Link> : null}</div></nav>
    </main>;
  } finally { await db.$disconnect(); }
}

function viewWhere(view: ActionView, userId: string, now: Date): Prisma.ActionWhereInput {
  const active: Prisma.ActionWhereInput = { status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] } };
  const soon = new Date(now); soon.setUTCDate(soon.getUTCDate() + 7);
  if (view === "MINE") return { ...active, ownerId: userId };
  if (view === "OVERDUE") return { ...active, dueDate: { lt: now } };
  if (view === "DUE_SOON") return { ...active, dueDate: { gte: now, lte: soon } };
  if (view === "VERIFICATION") return { ...active, lifecycleStatus: "AWAITING_VERIFICATION" };
  if (view === "EFFECTIVENESS") return { ...active, lifecycleStatus: "AWAITING_EFFECTIVENESS" };
  if (view === "CLOSURE") return { ...active, lifecycleStatus: "READY_FOR_CLOSURE" };
  if (view === "HIGH_CRITICAL") return { ...active, priority: { in: ["HIGH", "CRITICAL"] } };
  if (view === "ALL") return {};
  return { ...active, OR: [{ dueDate: { lte: soon } }, { status: "BLOCKED" }, { priority: { in: ["HIGH", "CRITICAL"] } }, { lifecycleStatus: { in: ["AWAITING_VERIFICATION", "AWAITING_EFFECTIVENESS", "READY_FOR_CLOSURE", "REOPENED_REPEAT_FINDING"] } }, { escalationRequired: true }] };
}

function actionWorklistItem(action: { id: string; reference: string; title: string; sourceType: string; sourceReference: string | null; sourceRecordId: string | null; sourceUrl: string | null; status: string; lifecycleStatus: string; priority: string; dueDate: Date; progressPercent: number; recurrenceCount: number; escalationRequired: boolean; owner: { name: string }; oversightOwner: { name: string } | null; location: { name: string } | null; client: { firstName: string; lastName: string } | null; staffMember: { firstName: string; lastName: string } | null; updates: { nextStep: string | null; blocker: string | null }[]; externalDependencies: { partyName: string; dueDate: Date }[]; _count: { evidenceLinks: number; occurrences: number } }, now: Date): GovernanceWorklistItem {
  const effective = effectiveActionStatus(action.status, action.dueDate, now), days = actionDaysRemaining(action.dueDate, now), href = sourcePath(action.sourceType, action.sourceRecordId, action.sourceUrl);
  const subject = action.client ? `${action.client.firstName} ${action.client.lastName}` : action.staffMember ? `${action.staffMember.firstName} ${action.staffMember.lastName}` : null;
  return { id: action.id, href: `/actions/${action.id}`, reference: action.reference, title: action.title, subject, location: action.location?.name ?? "Organisation-wide", owner: action.owner.name, stage: stageLabel(action.lifecycleStatus, action.status), attention: attentionLabel(action, effective, days, now), tone: actionTone(action, effective), source: href ? { href, label: `From ${actionLabel(action.sourceType)}${action.sourceReference ? ` ${action.sourceReference}` : ""}` } : null, ctaLabel: action.lifecycleStatus === "AWAITING_VERIFICATION" ? "Review completion" : action.lifecycleStatus === "AWAITING_EFFECTIVENESS" ? "Review effectiveness" : action.lifecycleStatus === "READY_FOR_CLOSURE" ? "Review closure" : "Review action", supporting: [`Oversight: ${action.oversightOwner?.name ?? "Not assigned"}`, `Due ${date(action.dueDate)}`, `${action._count.evidenceLinks} Evidence item${action._count.evidenceLinks === 1 ? "" : "s"}`, ...(action.recurrenceCount ? [`${action.recurrenceCount} recurrence${action.recurrenceCount === 1 ? "" : "s"}`] : [])] };
}

function attentionLabel(action: { lifecycleStatus: string; status: string; priority: string; escalationRequired: boolean; updates: { nextStep: string | null; blocker: string | null }[]; externalDependencies: { partyName: string; dueDate: Date }[] }, effective: string, days: number, now: Date) {
  if (action.lifecycleStatus === "CLOSED_VERIFIED") return "Closed with an attributable assurance decision";
  if (action.lifecycleStatus === "REOPENED_REPEAT_FINDING") return "Repeat finding — control and effectiveness review required";
  if (action.lifecycleStatus === "AWAITING_VERIFICATION") return "Completion submitted — manager verification required";
  if (action.lifecycleStatus === "AWAITING_EFFECTIVENESS") return "Completion verified — effectiveness review required";
  if (action.lifecycleStatus === "READY_FOR_CLOSURE") return "Assurance conditions recorded — authorised closure decision required";
  if (action.status === "BLOCKED") return `Blocked${action.updates[0]?.blocker ? ` — ${action.updates[0].blocker}` : " — reason and follow-up required"}`;
  if (action.externalDependencies[0]) { const item = action.externalDependencies[0]; return item.dueDate < now ? `External response overdue — chase ${item.partyName}` : `Awaiting ${item.partyName} — internal controls remain active`; }
  if (effective === "OVERDUE") return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (action.escalationRequired) return "Management escalation recorded — review the response";
  if (action.priority === "CRITICAL") return "Critical Action — close oversight required";
  if (days === 0) return "Due today";
  if (days > 0 && days <= 7) return `Due in ${days} day${days === 1 ? "" : "s"}`;
  return action.updates[0]?.nextStep || "Delivery work in progress";
}

function actionTone(action: { lifecycleStatus: string; status: string; priority: string }, effective: string): WorklistTone { if (action.lifecycleStatus === "CLOSED_VERIFIED") return "closed"; if (action.priority === "CRITICAL" || action.lifecycleStatus === "REOPENED_REPEAT_FINDING") return "critical"; if (effective === "OVERDUE") return "overdue"; if (action.status === "BLOCKED") return "attention"; if (["AWAITING_VERIFICATION", "AWAITING_EFFECTIVENESS", "READY_FOR_CLOSURE"].includes(action.lifecycleStatus)) return "assurance"; return "routine"; }
function stageLabel(lifecycle: string, status: string) { if (lifecycle === "AWAITING_VERIFICATION") return "Verification required"; if (lifecycle === "AWAITING_EFFECTIVENESS") return "Effectiveness review"; if (lifecycle === "READY_FOR_CLOSURE") return "Ready for closure"; if (lifecycle === "CLOSED_VERIFIED") return "Closed"; if (lifecycle === "REOPENED_REPEAT_FINDING") return "Reopened"; return actionLabel(status); }
function viewLabel(view: ActionView) { return ({ ATTENTION: "Needs attention", MINE: "Mine", OVERDUE: "Overdue", DUE_SOON: "Due soon", VERIFICATION: "Awaiting verification", EFFECTIVENESS: "Awaiting effectiveness", CLOSURE: "Ready for closure", HIGH_CRITICAL: "Critical / High", ALL: "All" } as Record<ActionView, string>)[view]; }
function Stat({ href, label, value, warn = false }: { href: string; label: string; value: number; warn?: boolean }) { return <Link href={href} className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}><p className="text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-sm font-semibold text-slate-600">{label}</p></Link>; }
function field(query: Record<string, string | string[] | undefined>, key: string) { const value = query[key]; return String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim(); }
function date(value: Date) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value); }
function withPage(query: Record<string, string | string[] | undefined>, page: number) { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value) params.set(key, Array.isArray(value) ? value[0] : value); params.set("page", String(page)); return `/actions?${params}`; }
function actionViewHref(view: ActionView, clientId: string, staffMemberId: string) { const params = new URLSearchParams({ view }); if (clientId) params.set("clientId", clientId); if (staffMemberId) params.set("staffMemberId", staffMemberId); return `/actions?${params}`; }
