import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { GovernanceWorklist, QuickViewNav, type GovernanceWorklistItem, type WorklistTone } from "@/components/governance-experience";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { registerGuidance, registerScopeWhere, registerStatusLabel } from "@/lib/registers";

const PAGE_SIZE = 20;
const allowedColumns = ["risk", "status", "location", "owner"] as const;
const ASSURANCE_REGISTERS = new Set(["incidents", "complaints", "safeguarding"]);
const VIEWS = ["ALL", "NEEDS_ATTENTION", "MINE", "CRITICAL", "CLOSED"] as const;
type View = (typeof VIEWS)[number];

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { key } = await params;
  const query = await searchParams;
  const q = String(query.q ?? "").trim();
  const status = String(query.status ?? "");
  const risk = String(query.risk ?? "");
  const sort = String(query.sort ?? "date-desc");
  const page = Math.max(1, Number(query.page) || 1);
  const mature = ASSURANCE_REGISTERS.has(key);
  const requestedView = String(query.view ?? "ALL").toUpperCase();
  const view: View = VIEWS.includes(requestedView as View) ? requestedView as View : "ALL";
  const requested = Array.isArray(query.columns) ? query.columns : String(query.columns ?? "risk,status,location,owner").split(",");
  const columns = allowedColumns.filter((column) => requested.includes(column));
  const db = createDb();

  try {
    const definition = await db.registerDefinition.findFirst({ where: { key, isPublished: true, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] } });
    if (!definition) notFound();
    const commonWhere: Prisma.RegisterEntryWhereInput = {
      AND: [
        registerScopeWhere(context),
        ...(q ? [{ OR: [{ reference: { contains: q, mode: "insensitive" as const } }, { title: { contains: q, mode: "insensitive" as const } }, { summary: { contains: q, mode: "insensitive" as const } }] }] : []),
      ],
      definitionId: definition.id,
      ...(status ? { status: status as never } : {}),
      ...(risk ? { riskLevel: risk as never } : {}),
    };
    const viewWhere = registerViewWhere(view, key, context.user.id);
    const where: Prisma.RegisterEntryWhereInput = { AND: [commonWhere, viewWhere] };
    const countBase: Prisma.RegisterEntryWhereInput = { ...registerScopeWhere(context), definitionId: definition.id };
    const [entries, total, allCount, attentionCount, mineCount, criticalCount, closedCount] = await Promise.all([
      db.registerEntry.findMany({
        where,
        include: {
          location: { select: { name: true } },
          owner: { select: { name: true } },
          client: { select: { firstName: true, lastName: true, preferredName: true, clientReference: true } },
          incidentInvestigation: { select: { status: true } },
          complaintInvestigation: { select: { status: true, acknowledgementDueAt: true, responseDueAt: true, extensionDueAt: true } },
          complaintCommunications: { where: { type: { in: ["ACKNOWLEDGEMENT", "FINAL_RESPONSE"] } }, select: { type: true } },
          safeguardingCase: { select: { status: true, safetyPosition: true, referralDecision: true, externalResponseDueAt: true, externalResponseStatus: true } },
          _count: { select: { evidenceLinks: true } },
        },
        orderBy: sort === "date-asc" ? { eventDate: "asc" } : sort === "reference" ? { reference: "asc" } : { eventDate: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.registerEntry.count({ where }),
      db.registerEntry.count({ where: countBase }),
      db.registerEntry.count({ where: { AND: [countBase, registerViewWhere("NEEDS_ATTENTION", key, context.user.id)] } }),
      db.registerEntry.count({ where: { AND: [countBase, registerViewWhere("MINE", key, context.user.id)] } }),
      db.registerEntry.count({ where: { AND: [countBase, registerViewWhere("CRITICAL", key, context.user.id)] } }),
      db.registerEntry.count({ where: { AND: [countBase, registerViewWhere("CLOSED", key, context.user.id)] } }),
    ]);
    const actions = mature && entries.length ? await db.action.findMany({
      where: { organisationId: context.organisation.id, sourceType: sourceType(key), sourceRecordId: { in: entries.map((entry) => entry.id) }, archivedAt: null },
      select: { sourceRecordId: true, closedAt: true },
    }) : [];
    const actionCounts = new Map<string, { total: number; outstanding: number }>();
    for (const action of actions) {
      if (!action.sourceRecordId) continue;
      const current = actionCounts.get(action.sourceRecordId) ?? { total: 0, outstanding: 0 };
      current.total += 1;
      if (!action.closedAt) current.outstanding += 1;
      actionCounts.set(action.sourceRecordId, current);
    }
    const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const guidance = registerGuidance(key);
    const workItems = mature ? entries.map((entry) => toWorklistItem(key, entry, actionCounts.get(entry.id), new Date())) : [];
    const pageUrl = (nextPage: number) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (risk) params.set("risk", risk);
      if (sort !== "date-desc") params.set("sort", sort);
      if (view !== "ALL") params.set("view", view);
      if (nextPage > 1) params.set("page", String(nextPage));
      return `?${params.toString()}`;
    };

    return <main className="mx-auto max-w-[1440px] space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-4xl"><Link href="/registers" className="text-sm font-bold text-emerald-800">← All registers</Link><p className="mt-4 text-xs font-black uppercase tracking-[.16em] text-emerald-700">{guidance.group.name}</p><h1 className="mt-1 text-3xl font-black tracking-tight">{definition.name}</h1><p className="mt-2 text-slate-600">{definition.description}</p></div>
        {canEdit ? <Link href={`/registers/${key}/new`} className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white">{key === "incidents" ? "Record incident" : key === "complaints" ? "Record complaint" : key === "safeguarding" ? "Record safeguarding" : "Add entry"}</Link> : null}
      </header>

      {mature ? <QuickViewNav active={view} items={[
        { key: "ALL", label: "All", count: allCount },
        { key: "NEEDS_ATTENTION", label: "Needs attention", count: attentionCount },
        { key: "MINE", label: "Mine", count: mineCount },
        { key: "CRITICAL", label: "Critical", count: criticalCount },
        { key: "CLOSED", label: "Closed", count: closedCount },
      ]} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          {mature && view !== "ALL" ? <input type="hidden" name="view" value={view} /> : null}
          <label className="sr-only" htmlFor="register-search">Search this register</label>
          <input id="register-search" name="q" defaultValue={q} placeholder="Search reference, title or summary" className="min-h-11 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          <button className="min-h-11 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white">Search</button>
          <details className="lg:col-span-2">
            <summary className="cursor-pointer text-sm font-bold text-emerald-800">More filters and exports</summary>
            <div className="mt-3 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-3 xl:grid-cols-5">
              <select name="status" defaultValue={status} className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option>{["OPEN", "IN_REVIEW", "AWAITING_ACTION", "CLOSED", "ARCHIVED"].map((value) => <option key={value} value={value}>{registerStatusLabel(value)}</option>)}</select>
              <select name="risk" defaultValue={risk} className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">All risk levels</option>{["UNASSESSED", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => <option key={value} value={value}>{registerStatusLabel(value)}</option>)}</select>
              <select name="sort" defaultValue={sort} className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="reference">Reference</option></select>
              <div className="flex flex-wrap gap-2 md:col-span-3 xl:col-span-2"><Link href={`/api/registers/${key}/export`} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold">CSV</Link><Link href={`/api/registers/${key}/export?format=xls`} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold">Excel</Link><Link href={`/registers/${key}/report`} target="_blank" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold">Print / PDF</Link></div>
              {!mature ? <fieldset className="flex flex-wrap gap-4 text-xs md:col-span-3 xl:col-span-5"><legend className="mr-2 font-semibold">Visible columns</legend>{allowedColumns.map((column) => <label key={column} className="capitalize"><input type="checkbox" name="columns" value={column} defaultChecked={columns.includes(column)} /> {column}</label>)}</fieldset> : null}
            </div>
          </details>
        </form>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">{total} matching record{total === 1 ? "" : "s"} · Page {page} of {pages}</p>{mature ? <p className="text-sm text-slate-500">Open a row to see current risk, Actions, Evidence and assurance requirements together.</p> : null}</div>

      {!entries.length ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-bold">No records match this view</h2><p className="mt-1 text-sm text-slate-600">Adjust the quick view or search filters.</p></section> : mature ? <GovernanceWorklist items={workItems} /> : <LegacyTable entries={entries} columns={columns} registerKey={key} />}

      <nav className="flex justify-between" aria-label="Register pages">{page > 1 ? <Link href={pageUrl(page - 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">← Previous</Link> : <span />}{page < pages ? <Link href={pageUrl(page + 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Next →</Link> : null}</nav>
    </main>;
  } finally {
    await db.$disconnect();
  }
}

function registerViewWhere(view: View, key: string, userId: string): Prisma.RegisterEntryWhereInput {
  if (view === "MINE") return { ownerId: userId, status: { notIn: ["CLOSED", "ARCHIVED"] } };
  if (view === "CRITICAL") return { riskLevel: "CRITICAL", status: { notIn: ["CLOSED", "ARCHIVED"] } };
  if (view === "CLOSED") return { status: "CLOSED" };
  if (view !== "NEEDS_ATTENTION") return {};
  if (key === "complaints") return { status: { notIn: ["CLOSED", "ARCHIVED"] }, OR: [{ riskLevel: { in: ["UNASSESSED", "HIGH", "CRITICAL"] } }, { complaintInvestigation: { status: "COMPLETED" } }, { status: "AWAITING_ACTION" }] };
  if (key === "safeguarding") return { status: { notIn: ["CLOSED", "ARCHIVED"] }, OR: [{ riskLevel: { in: ["UNASSESSED", "HIGH", "CRITICAL"] } }, { safeguardingCase: { OR: [{ safetyPosition: { in: ["UNRESOLVED_IMMEDIATE_RISK", "UNKNOWN_EVIDENCE_REQUIRED"] } }, { referralDecision: { in: ["AWAITING_DECISION", "REQUIRED"] } }, { status: "READY_FOR_ASSURANCE" }] } }] };
  if (key === "incidents") return { status: { notIn: ["CLOSED", "ARCHIVED"] }, OR: [{ riskLevel: { in: ["UNASSESSED", "HIGH", "CRITICAL"] } }, { incidentInvestigation: { is: null } }, { incidentInvestigation: { status: { not: "COMPLETED" } } }, { status: "AWAITING_ACTION" }] };
  return { status: { notIn: ["CLOSED", "ARCHIVED"] } };
}

type Entry = Prisma.RegisterEntryGetPayload<{ include: {
  location: { select: { name: true } };
  owner: { select: { name: true } };
  client: { select: { firstName: true; lastName: true; preferredName: true; clientReference: true } };
  incidentInvestigation: { select: { status: true } };
  complaintInvestigation: { select: { status: true; acknowledgementDueAt: true; responseDueAt: true; extensionDueAt: true } };
  complaintCommunications: { select: { type: true } };
  safeguardingCase: { select: { status: true; safetyPosition: true; referralDecision: true; externalResponseDueAt: true; externalResponseStatus: true } };
  _count: { select: { evidenceLinks: true } };
} }>;

function toWorklistItem(key: string, entry: Entry, actionCount: { total: number; outstanding: number } | undefined, now: Date): GovernanceWorklistItem {
  const assessment = attentionFor(key, entry, now);
  const person = entry.client ? `${entry.client.preferredName || entry.client.firstName} ${entry.client.lastName} · ${entry.client.clientReference}` : null;
  const supporting = [`${entry._count.evidenceLinks} Evidence linked`];
  if (actionCount?.total) supporting.unshift(`${actionCount.outstanding} of ${actionCount.total} Actions outstanding`);
  return {
    id: entry.id,
    href: `/registers/${key}/${entry.id}`,
    reference: entry.reference,
    title: entry.title,
    subject: person,
    location: entry.location?.name ?? "Organisation-wide",
    owner: entry.owner?.name ?? "Owner not assigned",
    stage: registerStatusLabel(entry.status),
    attention: assessment.message,
    supporting,
    tone: assessment.tone,
  };
}

function attentionFor(key: string, entry: Entry, now: Date): { message: string; tone: WorklistTone } {
  if (entry.status === "CLOSED" || entry.status === "ARCHIVED") return { message: entry.status === "CLOSED" ? "Closed by a governed decision" : "Archived record", tone: "closed" };
  if (entry.riskLevel === "CRITICAL") return { message: "Critical — senior governance oversight required", tone: "critical" };
  if (entry.riskLevel === "UNASSESSED") return { message: "Professional risk assessment required", tone: "attention" };
  if (key === "safeguarding") {
    const record = entry.safeguardingCase;
    if (!record || ["UNRESOLVED_IMMEDIATE_RISK", "UNKNOWN_EVIDENCE_REQUIRED"].includes(record.safetyPosition)) return { message: "Immediate safety confirmation required", tone: "critical" };
    if (["AWAITING_DECISION", "REQUIRED"].includes(record.referralDecision)) return { message: "Safeguarding referral requires action", tone: "attention" };
    if (record.externalResponseDueAt && record.externalResponseDueAt < now && !record.externalResponseStatus?.trim()) return { message: "External safeguarding response overdue", tone: "overdue" };
    if (record.status === "READY_FOR_ASSURANCE") return { message: "Authorised management assurance required", tone: "assurance" };
    return { message: "Safeguarding enquiry and external follow-up in progress", tone: "routine" };
  }
  if (key === "complaints") {
    const acknowledged = entry.complaintCommunications.some((item) => item.type === "ACKNOWLEDGEMENT");
    const responded = entry.complaintCommunications.some((item) => item.type === "FINAL_RESPONSE");
    const investigation = entry.complaintInvestigation;
    if (!acknowledged && investigation?.acknowledgementDueAt && investigation.acknowledgementDueAt < now) return { message: "Complaint acknowledgement overdue", tone: "overdue" };
    const responseDue = investigation?.extensionDueAt ?? investigation?.responseDueAt;
    if (!responded && responseDue && responseDue < now) return { message: "Complaint response overdue", tone: "overdue" };
    if (investigation?.status === "COMPLETED" && responded) return { message: "Management assurance review required", tone: "assurance" };
    return { message: "Complaint investigation requires completion", tone: "attention" };
  }
  if (entry.incidentInvestigation?.status !== "COMPLETED") return { message: "Incident investigation requires completion", tone: entry.riskLevel === "HIGH" ? "attention" : "routine" };
  return { message: "Management assurance review required", tone: "assurance" };
}

function LegacyTable({ entries, columns, registerKey }: { entries: Entry[]; columns: Array<(typeof allowedColumns)[number]>; registerKey: string }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead><tr><th className="p-4">Reference</th><th className="p-4">Date</th><th className="p-4">Entry</th>{columns.includes("risk") ? <th className="p-4">Risk</th> : null}{columns.includes("status") ? <th className="p-4">Status</th> : null}{columns.includes("location") ? <th className="p-4">Location</th> : null}{columns.includes("owner") ? <th className="p-4">Owner</th> : null}<th className="p-4">Evidence</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td className="p-4 font-mono text-xs">{entry.reference}</td><td className="p-4">{formatDate(entry.eventDate)}</td><td className="p-4"><Link href={`/registers/${registerKey}/${entry.id}`} className="font-semibold text-emerald-800">{entry.title}</Link><p className="max-w-md truncate text-xs text-slate-500">{entry.summary}</p></td>{columns.includes("risk") ? <td className="p-4"><Risk value={entry.riskLevel} /></td> : null}{columns.includes("status") ? <td className="p-4">{registerStatusLabel(entry.status)}</td> : null}{columns.includes("location") ? <td className="p-4">{entry.location?.name ?? "Organisation"}</td> : null}{columns.includes("owner") ? <td className="p-4">{entry.owner?.name ?? "Unassigned"}</td> : null}<td className="p-4">{entry._count.evidenceLinks}</td></tr>)}</tbody></table></div>;
}

function sourceType(key: string) {
  return key === "incidents" ? "INCIDENT" : key === "complaints" ? "COMPLAINT" : "SAFEGUARDING";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value);
}

function Risk({ value }: { value: string }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-bold ${value === "UNASSESSED" ? "bg-violet-100 text-violet-900" : ["HIGH", "CRITICAL"].includes(value) ? "bg-red-100 text-red-800" : "bg-slate-100"}`}>{registerStatusLabel(value)}</span>;
}
