import { BellRing, CheckCircle2, ClipboardCheck, Gauge, LockKeyhole, Rocket, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import {
  ChecklistItemForm,
  ConfigurationVersionForm,
  NotificationPreferenceForm,
  PromotionReviewForm,
  StartImplementationForm,
  SubmitPromotionButton,
  WithdrawVersionButton,
} from "@/components/implementation-controls";
import {
  DEFAULT_CONFIGURATION,
  effectiveNotificationPreferences,
  implementationReadiness,
  parseConfigurationSettings,
  SAFE_CONFIGURATION_CONTROLS,
  configurationLabel,
  type NotificationCadenceKey,
  type NotificationCategoryKey,
} from "@/lib/configurable-delivery";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ImplementationPage() {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), db = createDb(), now = new Date(), thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000), sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  try {
    const [versions, plan, savedPreferences, adoptionEvents, activityEvents, activeMembers] = await Promise.all([
      db.tenantConfigurationVersion.findMany({ where: { organisationId: context.organisation.id }, include: { createdBy: { select: { name: true } }, approvedBy: { select: { name: true } }, promotion: { include: { requestedBy: { select: { name: true } }, reviewedBy: { select: { name: true } } } } }, orderBy: { versionNumber: "desc" }, take: 20 }),
      db.implementationPlan.findUnique({ where: { organisationId: context.organisation.id }, include: { owner: { select: { name: true } }, items: { include: { completedBy: { select: { name: true } } }, orderBy: { key: "asc" } } } }),
      db.notificationPreference.findMany({ where: { organisationId: context.organisation.id, membershipId: context.membershipId }, select: { category: true, enabled: true, cadence: true } }),
      db.productAdoptionEvent.findMany({ where: { organisationId: context.organisation.id, createdAt: { gte: thirtyDaysAgo } }, select: { userId: true, moduleKey: true, eventName: true, outcome: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1000 }),
      db.activityLog.findMany({ where: { organisationId: context.organisation.id, createdAt: { gte: thirtyDaysAgo }, userId: { not: null } }, select: { userId: true, recordType: true, action: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 2000 }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { userId: true, role: { select: { name: true } }, user: { select: { mfaEnabledAt: true } } } }),
    ]);

    const published = versions.find((item) => item.status === "PUBLISHED"), openVersion = versions.find((item) => ["DRAFT", "SUBMITTED"].includes(item.status)), defaults = published ? parseConfigurationSettings(published.settings) : DEFAULT_CONFIGURATION, readiness = implementationReadiness(plan?.items ?? []), preferences = effectiveNotificationPreferences(savedPreferences as Array<{ category: NotificationCategoryKey; enabled: boolean; cadence: NotificationCadenceKey }>, defaults.defaultDigestCadence), weeklyActiveUsers = new Set(activityEvents.filter((item) => item.createdAt >= sevenDaysAgo).map((item) => item.userId)).size, mfaCoverage = activeMembers.length ? Math.round((activeMembers.filter((item) => item.user.mfaEnabledAt).length / activeMembers.length) * 100) : 0;
    const workflowCounts = new Map<string, number>();
    for (const item of activityEvents) workflowCounts.set(item.recordType, (workflowCounts.get(item.recordType) ?? 0) + 1);
    const leadingWorkflows = [...workflowCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 6), successfulAdoption = adoptionEvents.filter((item) => item.outcome === "SUCCESS").length, failedAdoption = adoptionEvents.filter((item) => item.outcome === "FAILURE").length;

    return <main className="space-y-7">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-emerald-900 p-7 text-white shadow-lg">
        <p className="text-sm font-black uppercase tracking-[.18em] text-emerald-200">Phase 10 · configurable delivery</p><h1 className="mt-2 text-3xl font-black">Implementation Centre</h1><p className="mt-3 max-w-4xl leading-7 text-emerald-50">Configure QCGMS safely for this organisation, prove onboarding readiness, test in a sandbox and require an independent manager before anything becomes live. Protected safety controls remain locked in every version.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Pill icon={LockKeyhole} text="Safety defaults locked" /><Pill icon={ShieldCheck} text="Independent promotion" /><Pill icon={Gauge} text="Privacy-safe adoption measures" /></div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={Rocket} label="Implementation stage" value={configurationLabel(plan?.stage ?? "NOT_STARTED")} />
        <Stat icon={ClipboardCheck} label="Required readiness" value={plan ? `${readiness.percentage}%` : "Not started"} good={readiness.ready} />
        <Stat icon={Settings2} label="Live configuration" value={published ? `Version ${published.versionNumber}` : "Baseline only"} />
        <Stat icon={UsersRound} label="Weekly active users" value={weeklyActiveUsers || "No data recorded"} />
        <Stat icon={ShieldCheck} label="Active-user MFA" value={activeMembers.length ? `${mfaCoverage}%` : "No data recorded"} warn={Boolean(activeMembers.length && mfaCoverage < 100)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4"><Heading title="Versioned organisation configuration" subtitle="Create one controlled sandbox version, complete readiness evidence and submit it for independent promotion." />
          {openVersion ? <VersionCard version={openVersion} currentUserId={context.user.id} readinessReady={readiness.ready} /> : <article className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black">Create the next sandbox version</h3><p className="mt-1 text-sm text-slate-600">The form starts from the current live version. Safety controls are added server-side and cannot be edited.</p><div className="mt-5"><ConfigurationVersionForm defaults={defaults} /></div></article>}
          <div className="grid gap-3 sm:grid-cols-2">{versions.filter((item) => item.id !== openVersion?.id).slice(0, 6).map((item) => <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><h3 className="font-black">Version {item.versionNumber}</h3><Badge value={item.status} /></div><p className="mt-2 text-sm text-slate-600">{item.changeSummary}</p><p className="mt-3 text-xs text-slate-500">Created by {item.createdBy.name} · {date(item.createdAt)}{item.approvedBy ? ` · approved by ${item.approvedBy.name}` : ""}</p></article>)}</div>
        </div>
        <div className="space-y-4"><Heading title="Protected safety defaults" subtitle="These controls are present in every saved snapshot and are validated again before promotion." /><div className="grid gap-3">{Object.entries(SAFE_CONFIGURATION_CONTROLS).map(([key]) => <article key={key} className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={20} /><div><h3 className="font-black text-emerald-950">{configurationLabel(key)}</h3><p className="text-xs text-emerald-900">Mandatory · cannot be disabled by tenant configuration</p></div></article>)}</div></div>
      </section>

      <section className="space-y-4"><Heading title="Controlled onboarding and go-live evidence" subtitle="Each required item needs a meaningful evidence note. Configuration promotion remains blocked until every required item is complete." />
        {!plan ? <article className="max-w-xl rounded-2xl border border-indigo-200 bg-indigo-50 p-5"><h3 className="font-black text-indigo-950">Start the implementation plan</h3><p className="mb-4 mt-1 text-sm text-indigo-900">Set a target date and create the seven controlled readiness checks.</p><StartImplementationForm /></article> : <><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-700">{configurationLabel(plan.stage)} · owned by {plan.owner.name}</p><h3 className="mt-1 text-xl font-black">{readiness.complete} of {readiness.required} required items evidenced</h3><p className="text-sm text-slate-500">Target: {plan.targetLiveDate ? date(plan.targetLiveDate) : "Not set"}</p></div><div className="w-full max-w-xs"><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${readiness.percentage}%` }} /></div><p className="mt-1 text-right text-xs font-black">{readiness.percentage}%</p></div></div><div className="grid gap-4 xl:grid-cols-2">{plan.items.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${item.status === "BLOCKED" ? "border-red-300" : item.status === "COMPLETE" ? "border-emerald-300" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-700">{configurationLabel(item.key)}</p><h3 className="mt-1 font-black">{item.title}</h3></div><Badge value={item.status} warn={item.status === "BLOCKED"} /></div><p className="mt-2 text-sm text-slate-600">{item.description}</p>{item.completedBy ? <p className="mt-2 text-xs text-slate-500">Completed by {item.completedBy.name} · {item.completedAt ? date(item.completedAt) : "date unavailable"}</p> : null}<ChecklistItemForm id={item.id} status={item.status} evidenceNote={item.evidenceNote} /></article>)}</div></>}
      </section>

      <section className="space-y-4"><Heading title="My notification controls" subtitle="These preferences control the current in-app notification feed. Email delivery is not represented as active until a mail provider is configured." /><div className="grid gap-4 xl:grid-cols-2">{preferences.map((item) => <article key={item.category} className={`rounded-2xl border bg-white p-5 shadow-sm ${item.locked ? "border-emerald-300" : ""}`}><div className="flex items-start gap-3"><BellRing className={item.locked ? "text-emerald-700" : "text-indigo-700"} size={20} /><div><h3 className="font-black">{item.label}</h3><p className="mt-1 text-sm text-slate-600">{item.description}</p></div></div><NotificationPreferenceForm category={item.category} enabled={item.enabled} cadence={item.cadence} locked={item.locked} /></article>)}</div></section>

      <section className="space-y-4"><Heading title="Adoption evidence · last 30 days" subtitle="Only workflow metadata is counted. QCGMS does not copy form narrative, client details or document content into product analytics." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Mini label="Tracked implementation events" value={adoptionEvents.length || "No data recorded"} /><Mini label="Successful events" value={successfulAdoption || "No data recorded"} /><Mini label="Failed events" value={failedAdoption || "No data recorded"} /><Mini label="Active members" value={activeMembers.length || "No data recorded"} /></div><div className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border bg-white p-5"><h3 className="font-black">Most-used governed record types</h3><div className="mt-4 space-y-3">{leadingWorkflows.length ? leadingWorkflows.map(([label, count]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm"><span>{configurationLabel(label)}</span><strong>{count} audited event{count === 1 ? "" : "s"}</strong></div>) : <Empty />}</div></article><article className="rounded-2xl border bg-white p-5"><h3 className="font-black">Measurement boundaries</h3><ul className="mt-3 space-y-2 text-sm text-slate-600"><li>• No client or staff narrative is captured.</li><li>• Missing denominators display “No data recorded”.</li><li>• Counts do not imply compliance or predict a regulator rating.</li><li>• Implementation events remain tenant-scoped and attributable.</li></ul></article></div></section>
    </main>;
  } finally { await db.$disconnect(); }
}

type ConfigurationVersionWithReview = Prisma.TenantConfigurationVersionGetPayload<{ include: { createdBy: { select: { name: true } }; approvedBy: { select: { name: true } }; promotion: { include: { requestedBy: { select: { name: true } }; reviewedBy: { select: { name: true } } } } } }>;

function VersionCard({ version, currentUserId, readinessReady }: { version: ConfigurationVersionWithReview; currentUserId: string; readinessReady: boolean }) {
  const settings = parseConfigurationSettings(version.settings), promotion = version.promotion, canReview = Boolean(promotion && promotion.status === "PENDING" && promotion.requestedById !== currentUserId && version.createdById !== currentUserId);
  return <article className="rounded-2xl border border-indigo-300 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-indigo-700">Sandbox configuration</p><h3 className="mt-1 text-xl font-black">Version {version.versionNumber}</h3><p className="mt-1 text-sm text-slate-600">{version.changeSummary}</p></div><Badge value={version.status} /></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3"><Meta label="Jurisdiction" value={configurationLabel(settings.defaultJurisdiction)} /><Meta label="Action escalation" value={`${settings.actionEscalationDays} day(s)`} /><Meta label="Review lead" value={`${settings.reviewLeadDays} days`} /><Meta label="Evidence expiry lead" value={`${settings.evidenceExpiryLeadDays} days`} /><Meta label="Digest" value={configurationLabel(settings.defaultDigestCadence)} /><Meta label="Created by" value={version.createdBy.name} /></dl>{version.status === "DRAFT" ? <div className="mt-5 flex flex-wrap items-start gap-3"><SubmitPromotionButton id={version.id} disabled={!readinessReady} /><WithdrawVersionButton id={version.id} /></div> : null}{promotion ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-black text-amber-950">Promotion {configurationLabel(promotion.status)}</p><p className="mt-1 text-sm text-amber-900">Requested by {promotion.requestedBy.name} on {date(promotion.requestedAt)}. A different authorised manager must decide.</p>{canReview ? <PromotionReviewForm id={promotion.id} /> : promotion.status === "PENDING" ? <p className="mt-3 text-xs font-bold text-amber-800">Waiting for an independent authorised manager.</p> : null}</div> : null}</article>;
}

function Pill({ icon: Icon, text }: { icon: typeof LockKeyhole; text: string }) { return <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black"><Icon size={15} />{text}</span>; }
function Stat({ icon: Icon, label, value, good = false, warn = false }: { icon: typeof Rocket; label: string; value: string | number; good?: boolean; warn?: boolean }) { return <article className={`rounded-2xl border p-5 shadow-sm ${warn ? "border-amber-200 bg-amber-50" : good ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}><Icon size={20} className={warn ? "text-amber-700" : "text-emerald-700"} /><p className="mt-2 text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p></article>; }
function Heading({ title, subtitle }: { title: string; subtitle: string }) { return <div><h2 className="text-xl font-black">{title}</h2><p className="mt-1 max-w-4xl text-sm text-slate-600">{subtitle}</p></div>; }
function Badge({ value, warn = false }: { value: string; warn?: boolean }) { return <span className={`h-fit rounded-full px-2.5 py-1 text-[10px] font-black ${warn ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>{configurationLabel(value)}</span>; }
function Meta({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>; }
function Mini({ label, value }: { label: string; value: string | number }) { return <article className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></article>; }
function Empty() { return <p className="rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-slate-500">No data recorded</p>; }
function date(value: Date) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value); }
