import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, FileCheck2, HeartPulse, ListChecks, ShieldAlert } from "lucide-react";
import { AttentionStrip, GovernanceTimeline, type GovernanceTimelineEntry } from "@/components/governance-experience";
import { ProfilePhotoForm } from "@/components/profile-photo-form";
import { actionScopeWhere } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/dal";
import { carePlanScopeWhere } from "@/lib/care-plans";
import { clientLabel, clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { registerStatusLabel } from "@/lib/registers";
import { riskScopeWhere, riskStatusLabel } from "@/lib/risks";

const CLOSED_ACTIONS = new Set(["COMPLETED", "CANCELLED", "ARCHIVED"]);

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id } = await params;
  const db = createDb();
  try {
    const person = await db.client.findFirst({
      where: { id, ...clientScopeWhere(context) },
      include: {
        location: { select: { name: true } },
        registerEntries: {
          where: { status: { not: "ARCHIVED" } },
          include: {
            definition: { select: { key: true, name: true } },
            staffMember: { select: { firstName: true, lastName: true } },
            _count: { select: { evidenceLinks: true } },
          },
          orderBy: { eventDate: "desc" },
          take: 150,
        },
      },
    });
    if (!person) notFound();

    const [carePlans, actions] = await Promise.all([
      db.carePlan.findMany({
        where: { ...carePlanScopeWhere(context), clientId: person.id, archivedAt: null },
        select: { id: true, reference: true, status: true, overallRisk: true, nextReviewDate: true, effectiveDate: true, updatedAt: true, currentVersionNumber: true },
        orderBy: { updatedAt: "desc" }, take: 20,
      }),
      db.action.findMany({
        where: { ...actionScopeWhere(context), clientId: person.id, archivedAt: null },
        select: { id: true, reference: true, title: true, status: true, lifecycleStatus: true, priority: true, dueDate: true, createdAt: true, closedAt: true, sourceType: true, sourceRecordId: true, _count: { select: { evidenceLinks: true } } },
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }], take: 100,
      }),
    ]);
    const registerIds = person.registerEntries.map(({ id: entryId }) => entryId);
    const actionIds = actions.map(({ id: actionId }) => actionId);
    const riskIds = [...new Set(actions.filter(({ sourceType, sourceRecordId }) => sourceType === "RISK" && sourceRecordId).map(({ sourceRecordId }) => sourceRecordId as string))];
    const [evidence, linkedRisks] = await Promise.all([
      db.evidence.findMany({
        where: { AND: [evidenceScopeWhere(context), { archivedAt: null }, { OR: [
          { relatedModule: "Client", relatedRecordId: person.id },
          ...(registerIds.length ? [{ registerLinks: { some: { entryId: { in: registerIds } } } }] : []),
          ...(actionIds.length ? [{ actionLinks: { some: { actionId: { in: actionIds }, retiredAt: null } } }] : []),
        ] }] },
        select: { id: true, title: true, category: true, evidenceType: true, currentnessStatus: true, evidenceDate: true, reviewExpiryDate: true, createdAt: true },
        orderBy: { updatedAt: "desc" }, take: 24,
      }),
      riskIds.length ? db.risk.findMany({ where: { ...riskScopeWhere(context), id: { in: riskIds }, archivedAt: null }, select: { id: true, reference: true, title: true, residualLevel: true, residualScore: true, status: true, nextReviewDate: true }, orderBy: { residualScore: "desc" } }) : Promise.resolve([]),
    ]);

    const now = new Date();
    const inThirtyDays = new Date(now.getTime() + 30 * 86_400_000);
    const activePlan = carePlans.find(({ status }) => ["ACTIVE", "ACTIVE_WITH_ACTIONS", "REVIEW_DUE", "REVIEW_OVERDUE"].includes(status)) ?? carePlans[0];
    const assessments = person.registerEntries.filter((entry) => entry.definition.key.startsWith("assessment-"));
    const latestAssessment = assessments[0];
    const incidents = person.registerEntries.filter((entry) => entry.definition.key === "incidents");
    const complaints = person.registerEntries.filter((entry) => entry.definition.key === "complaints");
    const safeguarding = person.registerEntries.filter((entry) => entry.definition.key === "safeguarding");
    const reviews = person.registerEntries.filter((entry) => ["care-plan-reviews", "risk-assessment-reviews", "service-user-outcomes"].includes(entry.definition.key));
    const other = person.registerEntries.filter((entry) => !assessments.includes(entry) && !reviews.includes(entry) && !incidents.includes(entry) && !complaints.includes(entry) && !safeguarding.includes(entry));
    const openActions = actions.filter((action) => !CLOSED_ACTIONS.has(action.status));
    const overdueActions = openActions.filter((action) => action.dueDate < now);
    const seriousRecords = [...incidents, ...complaints, ...safeguarding].filter((entry) => entry.status !== "CLOSED" && ["HIGH", "CRITICAL"].includes(entry.riskLevel));
    const planReviewDue = Boolean(activePlan?.nextReviewDate && activePlan.nextReviewDate <= inThirtyDays);
    const attention = [
      ...seriousRecords.map((entry) => `${entry.definition.name} ${entry.reference} is ${entry.riskLevel.toLowerCase()} and remains ${registerStatusLabel(entry.status).toLowerCase()}.`),
      ...overdueActions.map((action) => `${action.reference} is overdue: ${action.title}.`),
      ...(planReviewDue ? [`Care Plan ${activePlan?.reference} review is ${activePlan?.nextReviewDate && activePlan.nextReviewDate < now ? "overdue" : "due within 30 days"}.`] : []),
    ];
    const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
    const canManageActions = hasPermission(context.permissions, PERMISSIONS.ACTIONS_MANAGE);
    const canUploadEvidence = hasPermission(context.permissions, PERMISSIONS.EVIDENCE_UPLOAD);
    const name = clientName(person);
    const timeline: GovernanceTimelineEntry[] = [
      ...person.registerEntries.map((entry) => ({ id: `register-${entry.id}`, title: `${entry.definition.name}: ${entry.title}`, detail: `${entry.reference} · ${registerStatusLabel(entry.status)}`, actor: entry.staffMember ? `${entry.staffMember.firstName} ${entry.staffMember.lastName}` : null, occurredAt: entry.eventDate, tone: ["HIGH", "CRITICAL"].includes(entry.riskLevel) ? "attention" as const : "default" as const })),
      ...actions.map((action) => ({ id: `action-${action.id}`, title: `${action.reference}: ${action.title}`, detail: `${action.lifecycleStatus.toLowerCase().replaceAll("_", " ")} · due ${date(action.dueDate)}`, occurredAt: action.closedAt ?? action.createdAt, tone: action.closedAt ? "decision" as const : action.dueDate < now ? "attention" as const : "default" as const })),
      ...carePlans.map((plan) => ({ id: `plan-${plan.id}`, title: `Care Plan ${plan.reference}`, detail: `${label(plan.status)} · version ${plan.currentVersionNumber}`, occurredAt: plan.effectiveDate ?? plan.updatedAt, tone: ["ACTIVE", "ACTIVE_WITH_ACTIONS"].includes(plan.status) ? "decision" as const : "default" as const })),
      ...evidence.map((item) => ({ id: `evidence-${item.id}`, title: `Evidence: ${item.title}`, detail: `${item.category} · ${item.evidenceType}`, occurredAt: item.evidenceDate ?? item.createdAt })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 80);

    return <main className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 bg-slate-50 px-5 py-3"><Link href="/clients" className="text-sm font-bold text-emerald-800 hover:underline">← Client Directory</Link></div><div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start"><div className="flex min-w-0 items-center gap-4"><div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-emerald-100 text-2xl font-bold text-emerald-800 shadow">{person.profilePhotoKey ? <Image unoptimized fill className="object-cover" sizes="96px" src={`/api/clients/${person.id}/photo?v=${person.updatedAt.getTime()}`} alt={`${name} profile`} /> : <span aria-label="No profile picture">{person.firstName[0]}{person.lastName[0]}</span>}</div><div className="min-w-0"><p className="font-mono text-sm font-bold text-emerald-700">Client {person.clientNumber} · {person.clientReference}</p><h1 className="truncate text-3xl font-black">{name}</h1><p className="mt-1 text-slate-600">{clientLabel(person.status)} · {person.location?.name ?? "Organisation-wide"}</p></div></div><div className="flex flex-wrap gap-2 xl:max-w-xl xl:justify-end">{activePlan ? <Link href={`/care-plans/${activePlan.id}`} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Open care plan</Link> : canEdit ? <Link href={`/care-plans/new?clientId=${person.id}`} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Create care plan</Link> : null}{canEdit ? <Link href={`/registers/incidents/new?clientId=${person.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Record incident</Link> : null}{canManageActions ? <Link href={`/actions/new?clientId=${person.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Create action</Link> : null}{canUploadEvidence ? <Link href={`/evidence/new?relatedModule=Client&relatedRecordId=${person.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Add evidence</Link> : null}</div></div></header>

      <AttentionStrip title={attention.length ? `${attention.length} governance item${attention.length === 1 ? "" : "s"} need attention` : "No immediate governance exception identified"} detail={attention.length ? "Resolve the most serious or overdue item first; the profile below brings the connected record into one place." : "Current linked records do not show a high-risk open event, overdue Action or Care Plan review due within 30 days."} tone={seriousRecords.length ? "critical" : attention.length ? "attention" : "ready"} items={attention} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Client governance summary">
        <SummaryCard icon={HeartPulse} label="Current Care Plan" value={activePlan ? `${activePlan.reference} · ${label(activePlan.status)}` : "Not recorded"} detail={activePlan?.nextReviewDate ? `Review ${date(activePlan.nextReviewDate)}` : "No review date"} href={activePlan ? `/care-plans/${activePlan.id}` : canEdit ? `/care-plans/new?clientId=${person.id}` : undefined} warn={!activePlan || planReviewDue} />
        <SummaryCard icon={FileCheck2} label="Latest assessment" value={latestAssessment?.title ?? "Not recorded"} detail={latestAssessment ? `${latestAssessment.reference} · ${date(latestAssessment.eventDate)}` : "Start from this profile"} href={latestAssessment ? `/registers/${latestAssessment.definition.key}/${latestAssessment.id}` : canEdit ? `/registers/assessment-initial-needs/new?clientId=${person.id}` : undefined} warn={!latestAssessment} />
        <SummaryCard icon={ShieldAlert} label="Open safety / feedback" value={String([...incidents, ...complaints, ...safeguarding].filter(({ status }) => status !== "CLOSED").length)} detail={`${seriousRecords.length} high or critical`} warn={seriousRecords.length > 0} />
        <SummaryCard icon={ListChecks} label="Open actions" value={String(openActions.length)} detail={`${overdueActions.length} overdue`} href={`/actions?clientId=${person.id}`} warn={overdueActions.length > 0} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3"><Card title="Identity and contact"><InfoLine label="Preferred name" value={person.preferredName ?? person.firstName} /><InfoLine label="Service start" value={date(person.serviceStartDate)} /><InfoLine label="Phone" value={person.phone ?? "Not recorded"} /><InfoLine label="Email" value={person.email ?? "Not recorded"} /><InfoLine label="Address" value={[person.addressLine, person.town, person.postcode].filter(Boolean).join(", ") || "Not recorded"} /></Card><Card title="Communication and support"><p className="whitespace-pre-wrap"><strong>Communication:</strong> {person.communicationSummary ?? "Not recorded"}</p><p className="mt-3 whitespace-pre-wrap"><strong>Emergency contact:</strong> {person.emergencyContact ?? "Not recorded"}</p><p className="mt-3"><strong>Commissioner reference:</strong> {person.commissionerReference ?? "Not recorded"}</p></Card><Card title="Profile picture"><p className="mb-3 text-slate-600">Used to help authorised staff confirm they have the correct person record.</p>{canEdit ? <ProfilePhotoForm endpoint={`/api/clients/${person.id}/photo`} entityLabel="Client" hasPhoto={Boolean(person.profilePhotoKey)} /> : <p className="text-slate-500">Only authorised editors can update this picture.</p>}</Card></section>

      <Card title="Next of kin or representative">{person.nextOfKinName ? <div className="grid gap-3 text-sm md:grid-cols-2"><InfoLine label="Name" value={person.nextOfKinName} /><InfoLine label="Relationship" value={person.nextOfKinRelationship ?? "Not recorded"} /><InfoLine label="Phone" value={person.nextOfKinPhone ?? "Not recorded"} /><InfoLine label="Email" value={person.nextOfKinEmail ?? "Not recorded"} /><InfoLine label="Permission to contact" value={person.nextOfKinContactAllowed ? "Recorded" : "Not recorded"} /><InfoLine label="Documented authority" value={person.nextOfKinHasAuthority ? "Recorded" : "Not recorded"} /><div className="md:col-span-2"><InfoLine label="Authority and limits" value={person.nextOfKinAuthorityDetails ?? "No authority details recorded"} /></div></div> : <p className="text-sm text-slate-500">No next-of-kin or representative details recorded.</p>}<p className="mt-4 text-xs text-slate-500">Next-of-kin status alone does not provide legal authority. Check the verified source record before relying on a representative’s decision.</p></Card>

      <section className="grid gap-5 xl:grid-cols-3"><RecordGroup title="Incidents" empty="No linked incidents." entries={incidents} createHref={canEdit ? `/registers/incidents/new?clientId=${person.id}` : undefined} /><RecordGroup title="Safeguarding" empty="No linked safeguarding concerns." entries={safeguarding} createHref={canEdit ? `/registers/safeguarding/new?clientId=${person.id}` : undefined} /><RecordGroup title="Complaints" empty="No linked complaints." entries={complaints} createHref={canEdit ? `/registers/complaints/new?clientId=${person.id}` : undefined} /></section>
      <RecordGroup title="Assessments, reviews and outcomes" empty="No assessments or reviews have been recorded." entries={[...assessments, ...reviews].sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())} createHref={canEdit ? `/registers/assessment-initial-needs/new?clientId=${person.id}` : undefined} />
      {other.length ? <RecordGroup title="Other linked governance records" empty="No other linked records." entries={other} /> : null}

      <section className="grid gap-5 xl:grid-cols-2"><Card title="Actions and improvement"><LinkedList empty="No Action is linked to this person." items={actions.slice(0, 12).map((action) => ({ id: action.id, href: `/actions/${action.id}`, title: `${action.reference} · ${action.title}`, meta: `${action.priority.toLowerCase()} · ${action.lifecycleStatus.toLowerCase().replaceAll("_", " ")} · due ${date(action.dueDate)} · ${action._count.evidenceLinks} Evidence`, warn: !CLOSED_ACTIONS.has(action.status) && action.dueDate < now }))} /></Card><Card title="Linked risks"><LinkedList empty="No Risk is connected through this person’s Actions." items={linkedRisks.map((risk) => ({ id: risk.id, href: `/risks/${risk.id}`, title: `${risk.reference} · ${risk.title}`, meta: `${risk.residualLevel.toLowerCase()} · score ${risk.residualScore} · ${riskStatusLabel(risk.status)} · review ${date(risk.nextReviewDate)}`, warn: ["HIGH", "CRITICAL"].includes(risk.residualLevel) && risk.status !== "CLOSED" }))} /></Card></section>

      <Card title="Linked Evidence"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Evidence linked directly or through this person’s governed records and Actions.</p><Link href={`/evidence?relatedModule=Client&relatedRecordId=${person.id}`} className="text-sm font-bold text-emerald-800">Open direct profile Evidence →</Link></div><LinkedList empty="No governed Evidence is currently linked." items={evidence.map((item) => ({ id: item.id, href: `/evidence/${item.id}`, title: item.title, meta: `${item.category} · ${item.evidenceType} · ${(item.currentnessStatus ?? "unclassified").toLowerCase()}${item.reviewExpiryDate ? ` · review ${date(item.reviewExpiryDate)}` : ""}`, warn: Boolean(item.reviewExpiryDate && item.reviewExpiryDate < now) }))} /></Card>
      <GovernanceTimeline entries={timeline} />
    </main>;
  } finally { await db.$disconnect(); }
}

type Entry = { id: string; reference: string; eventDate: Date; title: string; status: string; riskLevel: string; definition: { key: string; name: string }; staffMember: { firstName: string; lastName: string } | null; _count: { evidenceLinks: number } };
function RecordGroup({ title, empty, entries, createHref }: { title: string; empty: string; entries: Entry[]; createHref?: string }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">{title}</h2>{createHref ? <Link href={createHref} className="text-sm font-bold text-emerald-800">Start new →</Link> : null}</div>{entries.length ? <ul className="mt-4 divide-y divide-slate-100">{entries.slice(0, 12).map((entry) => <li key={entry.id} className="py-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/registers/${entry.definition.key}/${entry.id}`} className="font-bold text-emerald-800 hover:underline">{entry.title}</Link><p className="mt-1 text-xs text-slate-500">{entry.definition.name} · {entry.reference}{entry.staffMember ? ` · ${entry.staffMember.firstName} ${entry.staffMember.lastName}` : ""}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${["HIGH", "CRITICAL"].includes(entry.riskLevel) && entry.status !== "CLOSED" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>{registerStatusLabel(entry.status)} · {entry._count.evidenceLinks} Evidence</span></div></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">{empty}</p>}</section>; }
function SummaryCard({ icon: Icon, label: heading, value, detail, href, warn = false }: { icon: typeof AlertTriangle; label: string; value: string; detail: string; href?: string; warn?: boolean }) { const body = <><div className="flex items-center justify-between gap-3"><Icon aria-hidden="true" size={20} className={warn ? "text-amber-700" : "text-emerald-700"} />{href ? <ArrowRight aria-hidden="true" size={16} className="text-slate-400" /> : null}</div><p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">{heading}</p><p className="mt-1 font-black text-slate-950">{value}</p><p className={`mt-1 text-xs ${warn ? "font-bold text-amber-800" : "text-slate-500"}`}>{detail}</p></>; return href ? <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/30">{body}</Link> : <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{body}</article>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-3 text-lg font-black">{title}</h2><div className="space-y-1 text-sm text-slate-700">{children}</div></section>; }
function InfoLine({ label: heading, value }: { label: string; value: string }) { return <p><strong>{heading}:</strong> {value}</p>; }
function LinkedList({ empty, items }: { empty: string; items: Array<{ id: string; href: string; title: string; meta: string; warn?: boolean }> }) { return items.length ? <ul className="divide-y divide-slate-100">{items.map((item) => <li key={item.id} className="py-3"><Link href={item.href} className="font-bold text-emerald-800 hover:underline">{item.title}</Link><p className={`mt-1 text-xs ${item.warn ? "font-bold text-red-700" : "text-slate-500"}`}>{item.meta}</p></li>)}</ul> : <p className="text-sm text-slate-500">{empty}</p>; }
function date(value: Date | null) { return value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/London" }).format(value) : "Not recorded"; }
function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()); }
