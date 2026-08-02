import Link from "next/link";
import { CalendarItemActions, ReminderForm } from "@/components/calendar-controls";
import { requirePermission } from "@/lib/auth/dal";
import { addDays, CALENDAR_RECORD_TYPES, CALENDAR_STATUSES, calendarLabel, monthGrid, reminderIsDue, sameDay, startOfDay, type CalendarEvent, weekGrid } from "@/lib/calendar";
import { getCalendarEvents } from "@/lib/calendar-data";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

type Query = Record<string, string | string[] | undefined>;

export default async function ComplianceCalendarPage({ searchParams }: { searchParams: Promise<Query> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const query = await searchParams;
  const view = ["month", "week", "agenda"].includes(String(query.view)) ? String(query.view) : "month";
  const anchor = parseAnchor(String(query.date ?? ""));
  const range = view === "month" ? monthGrid(anchor) : view === "week" ? weekGrid(anchor) : { start: addDays(anchor, -30), end: addDays(anchor, 180), days: [] };
  range.end.setUTCHours(23, 59, 59, 999);
  const db = createDb();
  try {
    const [allEvents, reminders, memberships] = await Promise.all([
      getCalendarEvents(context, range.start, range.end),
      db.calendarReminder.findMany({ where: { organisationId: context.organisation.id, userId: context.user.id }, orderBy: { createdAt: "desc" } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
    ]);
    const filters = { location: String(query.location ?? ""), owner: String(query.owner ?? ""), type: String(query.type ?? ""), risk: String(query.risk ?? ""), status: String(query.status ?? "") };
    const events = allEvents.filter((event) => (!filters.location || event.locationId === filters.location) && (!filters.owner || event.ownerId === filters.owner) && (!filters.type || event.type === filters.type) && (!filters.risk || event.riskLevel === filters.risk) && (!filters.status || event.status === filters.status));
    const now = new Date();
    const dueSoon = addDays(now, 30);
    const overdue = events.filter((item) => item.status === "OVERDUE").length;
    const nextThirty = events.filter((item) => item.status === "UPCOMING" && item.date <= dueSoon).length;
    const eventByKey = new Map(allEvents.map((item) => [item.key, item]));
    const dueReminders = reminders.flatMap((reminder) => {
      const event = eventByKey.get(reminder.eventKey);
      return event && reminderIsDue(event.date, reminder.offsetDays, now) ? [{ ...reminder, event }] : [];
    });
    const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
    const previous = moveAnchor(anchor, view, -1);
    const next = moveAnchor(anchor, view, 1);
    const title = view === "month" ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(anchor) : view === "week" ? `Week of ${formatDate(range.start)}` : `${formatDate(range.start)} to ${formatDate(range.end)}`;
    return <main className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Compliance Calendar</h1><p className="mt-1 text-slate-600">See upcoming reviews, meetings, deadlines, renewals and expiry dates.</p></div>
        {canEdit ? <Link href="/calendar/new" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Add deadline</Link> : null}
      </header>

      {dueReminders.length ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-950">Reminders requiring attention</h2><div className="mt-3 grid gap-2 md:grid-cols-2">{dueReminders.map(({ id, offsetDays, event }) => <Link key={id} href={event.href ?? "/calendar"} className="rounded-xl bg-white p-3 text-sm shadow-sm"><span className="font-semibold">{event.title}</span><span className="ml-2 text-amber-800">{offsetDays === -1 ? "Overdue" : offsetDays === 0 ? "Due today" : `${offsetDays}-day reminder`}</span></Link>)}</div></section> : null}

      <section className="grid gap-4 sm:grid-cols-3"><Stat label="Visible events" value={events.length} /><Stat label="Due in 30 days" value={nextThirty} warn={nextThirty > 0} /><Stat label="Overdue" value={overdue} danger={overdue > 0} /></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">{["month", "week", "agenda"].map((item) => <Link key={item} href={linkFor(query, { view: item })} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === item ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white"}`}>{calendarLabel(item)}</Link>)}</div>
          <div className="flex items-center gap-2"><Link href={linkFor(query, { date: previous })} className="rounded-lg border px-3 py-2 text-sm">Previous</Link><Link href={linkFor(query, { date: new Date().toISOString().slice(0, 10) })} className="rounded-lg border px-3 py-2 text-sm">Today</Link><Link href={linkFor(query, { date: next })} className="rounded-lg border px-3 py-2 text-sm">Next</Link></div>
        </div>
        <h2 className="mt-4 text-xl font-bold">{title}</h2>
      </section>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <input type="hidden" name="view" value={view} /><input type="hidden" name="date" value={anchor.toISOString().slice(0, 10)} />
        <select name="location" defaultValue={filters.location} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All locations</option>{context.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="owner" defaultValue={filters.owner} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All owners</option>{memberships.map(({ user }) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        <select name="type" defaultValue={filters.type} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All record types</option>{CALENDAR_RECORD_TYPES.map((item) => <option key={item} value={item}>{calendarLabel(item)}</option>)}</select>
        <select name="risk" defaultValue={filters.risk} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All risk levels</option>{["LOW", "MODERATE", "MEDIUM", "HIGH", "CRITICAL"].map((item) => <option key={item}>{calendarLabel(item)}</option>)}</select>
        <select name="status" defaultValue={filters.status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option>{CALENDAR_STATUSES.map((item) => <option key={item}>{calendarLabel(item)}</option>)}</select>
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
      </form>

      {view === "agenda" ? <Agenda events={events} canEdit={canEdit} /> : <CalendarGrid days={range.days} events={events} anchor={anchor} view={view} canEdit={canEdit} />}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Set an in-app reminder</h2><p className="mt-1 text-sm text-slate-600">Choose 90, 60, 30, 14 or 7 days before, the due date, or when overdue.</p><div className="mt-4"><ReminderForm events={allEvents.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status)).slice(0, 200).map((item) => ({ key: item.key, title: item.title, date: item.date.toISOString().slice(0, 10) }))} /></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Your reminder rules</h2>{reminders.length ? <ul className="mt-4 space-y-2 text-sm">{reminders.map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3"><span className="font-semibold">{eventByKey.get(item.eventKey)?.title ?? item.eventKey}</span><span className="ml-2 text-slate-600">{item.offsetDays === -1 ? "when overdue" : item.offsetDays === 0 ? "on due date" : `${item.offsetDays} days before`}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No reminder rules yet.</p>}</div>
      </section>
    </main>;
  } finally {
    await db.$disconnect();
  }
}

function CalendarGrid({ days, events, anchor, view, canEdit }: { days: Date[]; events: CalendarEvent[]; anchor: Date; view: string; canEdit: boolean }) {
  return <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="min-w-[840px]"><div className="grid grid-cols-7 border-b bg-slate-50">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="p-3 text-xs font-bold uppercase text-slate-500">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => {
    const dayEvents = events.filter((event) => sameDay(event.date, day));
    const faded = view === "month" && day.getUTCMonth() !== anchor.getUTCMonth();
    return <div key={day.toISOString()} className={`min-h-36 border-b border-r p-2 ${faded ? "bg-slate-50 text-slate-400" : ""}`}><p className="text-xs font-bold">{day.getUTCDate()}</p><div className="mt-2 space-y-1">{dayEvents.slice(0, 4).map((event) => <EventChip key={event.key} event={event} canEdit={canEdit} compact />)}{dayEvents.length > 4 ? <p className="text-xs text-slate-500">+{dayEvents.length - 4} more</p> : null}</div></div>;
  })}</div></div></section>;
}

function Agenda({ events, canEdit }: { events: CalendarEvent[]; canEdit: boolean }) {
  if (!events.length) return <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-bold">No calendar events found</h2><p className="mt-1 text-sm text-slate-600">Adjust the filters or add a manual compliance deadline.</p></section>;
  return <section className="space-y-3">{events.map((event) => <EventChip key={event.key} event={event} canEdit={canEdit} />)}</section>;
}

function EventChip({ event, canEdit, compact = false }: { event: CalendarEvent; canEdit: boolean; compact?: boolean }) {
  const content = <><div className="flex items-start justify-between gap-2"><p className={`font-semibold ${compact ? "text-xs" : ""}`}>{event.title}</p><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(event.status)}`}>{calendarLabel(event.status)}</span></div>{compact ? null : <><p className="mt-1 text-sm text-slate-600">{calendarLabel(event.type)} - {event.description}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span>{formatDate(event.date)}</span><span>{event.locationName}</span><span>{event.ownerName}</span>{event.riskLevel ? <span>{calendarLabel(event.riskLevel)} risk</span> : null}</div>{canEdit && event.key.startsWith("MANUAL:") ? <div className="mt-3"><CalendarItemActions id={event.key.slice(7)} status={event.status} /></div> : null}</>}</>;
  if (event.href) return <Link href={event.href} className={`${compact ? "block rounded-md border-l-4 border-emerald-600 bg-emerald-50 p-2" : "block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-400"}`}>{content}</Link>;
  return <article className={compact ? "rounded-md border-l-4 border-emerald-600 bg-emerald-50 p-2" : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"}>{content}</article>;
}

function Stat({ label, value, warn = false, danger = false }: { label: string; value: number; warn?: boolean; danger?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${danger ? "border-red-200 bg-red-50" : warn ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>;
}
function statusClass(status: string) { return status === "OVERDUE" ? "bg-red-100 text-red-800" : status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : status === "CANCELLED" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"; }
function formatDate(value: Date) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(value); }
function parseAnchor(value: string) { const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(); return Number.isNaN(date.valueOf()) ? startOfDay(new Date()) : date; }
function moveAnchor(anchor: Date, view: string, direction: number) { const date = new Date(anchor); if (view === "month") date.setUTCMonth(date.getUTCMonth() + direction); else date.setUTCDate(date.getUTCDate() + direction * (view === "week" ? 7 : 180)); return date.toISOString().slice(0, 10); }
function linkFor(query: Query, updates: Record<string, string>) { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value) params.set(key, Array.isArray(value) ? value[0] : value); for (const [key, value] of Object.entries(updates)) params.set(key, value); return `/calendar?${params}`; }
