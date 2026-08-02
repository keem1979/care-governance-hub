import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardList, FileCheck2, ListChecks, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { meetingAttention, meetingLabel, meetingReadiness, meetingScopeWhere, MEETING_STATUSES, MEETING_TYPES } from "@/lib/meetings";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const PAGE_SIZE = 20;

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW), query = await searchParams;
  const q = String(query.q ?? "").trim(), status = String(query.status ?? ""), type = String(query.type ?? ""), page = Math.max(1, Number(query.page) || 1);
  const now = new Date(), inThirty = new Date(now.getTime() + 30 * 86400000), db = createDb();
  try {
    const scope = meetingScopeWhere(context);
    const where = { AND: [scope, ...(q ? [{ OR: [{ reference: { contains: q, mode: "insensitive" as const } }, { title: { contains: q, mode: "insensitive" as const } }, { meetingType: { contains: q, mode: "insensitive" as const } }] }] : [])], ...(status ? { status: status as never } : {}), ...(type ? { meetingType: type } : {}) };
    const [meetings, total, upcoming, minutesNeeded, awaitingApproval, approved] = await Promise.all([
      db.governanceMeeting.findMany({ where, include: { chair: { select: { name: true } }, location: { select: { name: true } }, agendaItems: { select: { decision: true, linkedActionId: true } }, _count: { select: { attendees: true, agendaItems: true, evidenceLinks: true } } }, orderBy: [{ meetingDate: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      db.governanceMeeting.count({ where }),
      db.governanceMeeting.count({ where: { ...scope, status: { in: ["DRAFT", "SCHEDULED", "IN_PROGRESS"] }, meetingDate: { gte: now, lte: inThirty } } }),
      db.governanceMeeting.count({ where: { ...scope, status: { in: ["DRAFT", "SCHEDULED", "IN_PROGRESS"] }, meetingDate: { lt: now }, OR: [{ minutes: null }, { minutes: "" }] } }),
      db.governanceMeeting.count({ where: { ...scope, status: "AWAITING_APPROVAL" } }),
      db.governanceMeeting.count({ where: { ...scope, status: "APPROVED" } }),
    ]);
    const ids = meetings.map(({ id }) => id);
    const actionGroups = ids.length ? await db.action.groupBy({ by: ["sourceRecordId"], where: { organisationId: context.organisation.id, sourceType: "GOVERNANCE_MEETING", sourceRecordId: { in: ids } }, _count: { _all: true } }) : [];
    const actionCounts = new Map(actionGroups.map((group) => [group.sourceRecordId, group._count._all]));
    const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT), pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return <main className="space-y-7">
      <header className="rounded-3xl bg-gradient-to-br from-emerald-950 to-emerald-700 p-6 text-white shadow-sm md:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><h1 className="text-3xl font-black md:text-4xl">Governance Meetings</h1><p className="mt-2 max-w-2xl text-emerald-50">Plan meetings, record discussion and decisions, assign follow-up work and keep approved minutes with the supporting evidence.</p></div>{canEdit && <Link href="/meetings/new" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow-sm">Schedule a meeting</Link>}</div><div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Connection href="/calendar" icon={<CalendarDays size={17} />} label="Calendar" detail="Meeting dates" /><Connection href="/actions" icon={<ListChecks size={17} />} label="Action Tracker" detail="Agreed follow-up" /><Connection href="/evidence" icon={<FileCheck2 size={17} />} label="Evidence Library" detail="Approved records" /><Connection href="/reports/monthly-governance" icon={<ClipboardList size={17} />} label="Governance report" detail="Monthly review" /></div></header>

      <section aria-label="Meeting workload" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Due in the next 30 days" value={upcoming} icon={<CalendarDays />} /><Stat label="Minutes to complete" value={minutesNeeded} attention={minutesNeeded > 0} icon={<ClipboardList />} /><Stat label="Awaiting approval" value={awaitingApproval} attention={awaitingApproval > 0} icon={<CheckCircle2 />} /><Stat label="Approved records" value={approved} icon={<FileCheck2 />} /></section>

      {(minutesNeeded > 0 || awaitingApproval > 0) && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-950">Meeting records need attention</h2><p className="mt-1 text-sm text-amber-900">Complete outstanding minutes and approvals so decisions, actions and assurance can be relied on in reports and inspections.</p></section>}

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[2fr_1fr_1fr_auto]"><label className="sr-only" htmlFor="meeting-search">Search meetings</label><input id="meeting-search" name="q" defaultValue={q} placeholder="Search reference, title or type" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><select aria-label="Meeting status" name="status" defaultValue={status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option>{MEETING_STATUSES.map((item) => <option key={item} value={item}>{meetingLabel(item)}</option>)}</select><select aria-label="Meeting type" name="type" defaultValue={type} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All meeting types</option>{MEETING_TYPES.map((item) => <option key={item}>{item}</option>)}</select><button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Apply filters</button></form>

      {!meetings.length ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Users className="mx-auto text-slate-400" /><h2 className="mt-3 font-bold">No meetings match this view</h2><p className="mt-1 text-sm text-slate-600">Adjust the filters or schedule the next governance meeting.</p></section> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{meetings.map((meeting) => {
        const decisionCount = meeting.agendaItems.filter((item) => item.decision?.trim()).length;
        const readiness = meetingReadiness({ status: meeting.status, meetingDate: meeting.meetingDate, attendeeCount: meeting._count.attendees, agendaCount: meeting._count.agendaItems, decisionCount, minutes: meeting.minutes, approvedById: meeting.approvedById, approvalDate: meeting.approvalDate });
        const attention = meetingAttention({ status: meeting.status, meetingDate: meeting.meetingDate, attendeeCount: meeting._count.attendees, agendaCount: meeting._count.agendaItems, decisionCount, minutes: meeting.minutes, approvedById: meeting.approvedById, approvalDate: meeting.approvalDate }, now);
        return <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"><div className="flex items-start justify-between gap-3"><p className="font-mono text-xs font-bold text-emerald-700">{meeting.reference}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{meetingLabel(meeting.status)}</span></div><h2 className="mt-3 text-lg font-bold group-hover:text-emerald-800">{meeting.title}</h2><p className="mt-1 text-sm text-slate-600">{meeting.meetingType}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><Dt label="Date" value={`${date(meeting.meetingDate)} · ${meeting.meetingTime}`} /><Dt label="Chair" value={meeting.chair.name} /><Dt label="Location" value={meeting.location?.name ?? "Organisation-wide"} /><Dt label="Record" value={`${decisionCount} decisions · ${actionCounts.get(meeting.id) ?? 0} actions`} /></dl><div className="mt-4"><div className="flex justify-between text-xs"><span className="font-semibold">Record completeness</span><span>{readiness.completed}/{readiness.total}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${readiness.percent}%` }} /></div></div>{attention && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{attention}</p>}<p className="mt-3 text-xs text-slate-500">{meeting._count.agendaItems} agenda items · {meeting._count.attendees} people · {meeting._count.evidenceLinks} evidence links</p></Link>;
      })}</section>}
      <nav className="flex justify-between text-sm"><span>Page {page} of {pages}</span><div className="flex gap-2">{page > 1 && <Link href={withPage(query, page - 1)} className="rounded-lg border bg-white px-3 py-2">Previous</Link>}{page < pages && <Link href={withPage(query, page + 1)} className="rounded-lg border bg-white px-3 py-2">Next</Link>}</div></nav>
    </main>;
  } finally { await db.$disconnect(); }
}

function Connection({ href, icon, label, detail }: { href: string; icon: React.ReactNode; label: string; detail: string }) { return <Link href={href} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 hover:bg-white/20"><span>{icon}</span><span><strong className="block text-sm">{label}</strong><span className="text-xs text-emerald-100">{detail}</span></span></Link>; }
function Stat({ label, value, attention = false, icon }: { label: string; value: number; attention?: boolean; icon: React.ReactNode }) { return <div className={`rounded-2xl border p-5 ${attention ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between text-slate-600"><p className="text-sm">{label}</p><span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span></div><p className="mt-2 text-3xl font-black">{value}</p></div>; }
function Dt({ label, value }: { label: string; value: string }) { return <div><dt className="font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1">{value}</dd></div>; }
function date(value: Date) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }).format(value); }
function withPage(query: Record<string, string | string[] | undefined>, page: number) { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value) params.set(key, Array.isArray(value) ? value[0] : value); params.set("page", String(page)); return `/meetings?${params}`; }
