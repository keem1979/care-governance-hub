import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AlertTriangle, BookOpenCheck, FileCheck2, GraduationCap, ListChecks } from "lucide-react";
import { StaffComplianceForm, StaffDocumentForm, StaffLeaveForm, StaffPhotoForm } from "@/components/workforce-forms";
import { StaffAccountLinkForm } from "@/components/care-assurance-controls";
import { AttentionStrip, GovernanceTimeline, type GovernanceTimelineEntry } from "@/components/governance-experience";
import { actionScopeWhere } from "@/lib/actions";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  workforceLabel,
  workforceRecordState,
  workforceScopeWhere,
  leaveYearRange,
} from "@/lib/workforce";

export default async function StaffMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireAnyPermission([
    PERMISSIONS.WORKFORCE_VIEW,
    PERMISSIONS.WORKFORCE_MANAGE,
  ]);
  const { id } = await params;
  const db = createDb();
  try {
    const staff = await db.staffMember.findFirst({
      where: { id, ...workforceScopeWhere(context) },
      include: {
        location: { select: { name: true } },
        records: {
          include: { verifiedBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        leaveRequests: { where: { archivedAt: null }, include: { decidedBy: { select: { name: true } } }, orderBy: { startDate: "desc" } },
      },
    });
    if (!staff) notFound();
    const canManage = hasPermission(
      context.permissions,
      PERMISSIONS.WORKFORCE_MANAGE,
    );
    const canSeeGovernance = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW);
    const canSeeActions = context.permissions.some((permission) => [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT].includes(permission as never));
    const canManageActions = hasPermission(context.permissions, PERMISSIONS.ACTIONS_MANAGE);
    const canUploadEvidence = hasPermission(context.permissions, PERMISSIONS.EVIDENCE_UPLOAD);
    const locationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id: locationId }) => locationId) } }] };
    const [documents, courses, organisationUsers, actions, governanceRecords, assignments] = await Promise.all([
      db.evidence.findMany({ where: { AND: [evidenceScopeWhere(context), { relatedModule: "StaffMember", relatedRecordId: id, archivedAt: null }] }, include: { currentVersion: { select: { id: true, fileName: true } } }, orderBy: { createdAt: "desc" } }),
      db.trainingCourse.findMany({ where: { archivedAt: null, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] }, select: { id: true, title: true, suggestedRenewalMonths: true }, orderBy: { title: "asc" } }),
      canManage ? db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE", user: { isActive: true } }, select: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: "asc" } } }) : Promise.resolve([]),
      canSeeActions ? db.action.findMany({ where: { ...actionScopeWhere(context), staffMemberId: id, archivedAt: null }, select: { id: true, reference: true, title: true, status: true, lifecycleStatus: true, priority: true, dueDate: true, createdAt: true, closedAt: true }, orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }], take: 60 }) : Promise.resolve([]),
      canSeeGovernance ? db.registerEntry.findMany({ where: { organisationId: context.organisation.id, staffMemberId: id, archivedAt: null, ...locationScope }, select: { id: true, reference: true, title: true, eventDate: true, status: true, riskLevel: true, definition: { select: { key: true, name: true } } }, orderBy: { eventDate: "desc" }, take: 60 }) : Promise.resolve([]),
      canSeeGovernance ? db.carePlanStaffAssignment.findMany({ where: { staffMemberId: id, isActive: true, carePlan: { organisationId: context.organisation.id, archivedAt: null, ...locationScope } }, select: { id: true, requiredCompetencies: true, assignedAt: true, carePlan: { select: { id: true, reference: true, status: true, nextReviewDate: true } } }, orderBy: { assignedAt: "desc" }, take: 30 }) : Promise.resolve([]),
    ]);
    const now = new Date();
    const leaveYear = leaveYearRange(staff.leaveYearStartMonth, staff.leaveYearStartDay, now);
    const annualInYear = staff.leaveRequests.filter((leave) => leave.type === "ANNUAL" && leave.status === "APPROVED" && leave.startDate >= leaveYear.start && leave.startDate < leaveYear.end).reduce((sum, leave) => sum + Number(leave.requestedDays), 0);
    const pendingAnnual = staff.leaveRequests.filter((leave) => leave.type === "ANNUAL" && leave.status === "PENDING" && leave.startDate >= leaveYear.start && leave.startDate < leaveYear.end).reduce((sum, leave) => sum + Number(leave.requestedDays), 0);
    const allowance = Number(staff.annualLeaveEntitlementDays) + Number(staff.annualLeaveCarryOverDays);
    const recordAttention = staff.records.filter((record) => workforceRecordState(record, now) !== "CURRENT");
    const openActions = actions.filter(({ status }) => !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(status));
    const overdueActions = openActions.filter(({ dueDate }) => dueDate < now);
    const seriousGovernance = governanceRecords.filter((record) => record.status !== "CLOSED" && ["HIGH", "CRITICAL"].includes(record.riskLevel));
    const attention = [
      ...recordAttention.map((record) => `${record.title}: ${workforceLabel(workforceRecordState(record, now))}.`),
      ...overdueActions.map((action) => `${action.reference} is overdue: ${action.title}.`),
      ...seriousGovernance.map((record) => `${record.definition.name} ${record.reference} is ${record.riskLevel.toLowerCase()} and remains open.`),
    ];
    const timeline: GovernanceTimelineEntry[] = [
      ...staff.records.map((record) => ({ id: `record-${record.id}`, title: `${workforceLabel(record.type)}: ${record.title}`, detail: `${workforceLabel(record.outcome)}${record.expiryDate ? ` · expires ${date(record.expiryDate)}` : ""}`, actor: record.verifiedBy?.name ?? null, occurredAt: record.completedDate ?? record.createdAt, tone: workforceRecordState(record, now) === "CURRENT" ? "decision" as const : "attention" as const })),
      ...governanceRecords.map((record) => ({ id: `governance-${record.id}`, title: `${record.definition.name}: ${record.title}`, detail: `${record.reference} · ${workforceLabel(record.status)}`, occurredAt: record.eventDate, tone: ["HIGH", "CRITICAL"].includes(record.riskLevel) ? "attention" as const : "default" as const })),
      ...actions.map((action) => ({ id: `action-${action.id}`, title: `${action.reference}: ${action.title}`, detail: `${workforceLabel(action.lifecycleStatus)} · due ${date(action.dueDate)}`, occurredAt: action.closedAt ?? action.createdAt, tone: action.closedAt ? "decision" as const : action.dueDate < now ? "attention" as const : "default" as const })),
      ...documents.map((item) => ({ id: `evidence-${item.id}`, title: `Evidence: ${item.title}`, detail: `${item.category} · ${item.evidenceType}`, occurredAt: item.createdAt })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 80);

    return (
      <main className="space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3"><Link href="/workforce" className="text-sm font-bold text-emerald-800 hover:underline">← Staff Compliance & Competency</Link></div>
          <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="flex min-w-0 items-center gap-4"><div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-emerald-100 text-2xl font-bold text-emerald-800 shadow">{staff.profilePhotoKey ? <Image unoptimized fill className="object-cover" sizes="96px" src={`/api/workforce/${staff.id}/photo?v=${staff.updatedAt.getTime()}`} alt={`${staff.firstName} ${staff.lastName} profile`} /> : <span aria-label="No profile picture">{staff.firstName[0]}{staff.lastName[0]}</span>}</div><div className="min-w-0"><p className="font-mono text-sm font-bold text-emerald-700">Staff {staff.staffNumber} · {staff.employeeReference}</p><h1 className="truncate text-3xl font-black">{staff.preferredName?.trim() || staff.firstName} {staff.lastName}</h1><p className="mt-1 text-slate-600">{staff.jobTitle} · {staff.location?.name ?? "Organisation-wide"} · {workforceLabel(staff.employmentStatus)}</p></div></div>
            <div className="flex flex-wrap gap-2 xl:max-w-xl xl:justify-end">{canManage ? <a href="#add-compliance" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Add compliance record</a> : null}{canManageActions ? <Link href={`/actions/new?sourceType=WORKFORCE&sourceId=${staff.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Create action</Link> : null}{canUploadEvidence ? <Link href={`/evidence/new?relatedModule=StaffMember&relatedRecordId=${staff.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Add evidence</Link> : null}</div>
          </div>
        </header>

        <AttentionStrip title={attention.length ? `${attention.length} workforce assurance item${attention.length === 1 ? "" : "s"} need attention` : "No immediate workforce assurance exception identified"} detail={attention.length ? "Resolve expired checks, development needs, serious linked concerns and overdue Actions before relying on this profile for assurance." : "Current compliance records and linked governance work show no overdue or serious exception."} tone={seriousGovernance.length ? "critical" : attention.length ? "attention" : "ready"} items={attention} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Staff assurance summary">
          <ProfileStat icon={GraduationCap} label="Compliance position" value={`${staff.records.length - recordAttention.length} current`} detail={`${recordAttention.length} need attention`} warn={recordAttention.length > 0} />
          <ProfileStat icon={ListChecks} label="Linked actions" value={`${openActions.length} open`} detail={`${overdueActions.length} overdue`} warn={overdueActions.length > 0} />
          <ProfileStat icon={BookOpenCheck} label="Care assignments" value={String(assignments.length)} detail={assignments.length ? "Active governed assignments" : "No active assignment"} />
          <ProfileStat icon={FileCheck2} label="Evidence" value={String(documents.length)} detail="Controlled staff records" warn={!documents.length} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Identity and contact</h2><dl className="mt-4 space-y-2 text-sm"><Meta label="Department" value={staff.department ?? "Not set"} /><Meta label="Line manager" value={staff.lineManager ?? "Not set"} /><Meta label="Start date" value={date(staff.startDate)} /><Meta label="Work email" value={staff.workEmail ?? "Not recorded"} /><Meta label="Work phone" value={staff.workPhone ?? "Not recorded"} /></dl></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Staff profile picture</h2><p className="mt-1 mb-4 text-sm text-slate-600">Helps authorised managers identify the correct workforce record. It is never public.</p>{canManage ? <StaffPhotoForm staffId={staff.id} hasPhoto={Boolean(staff.profilePhotoKey)} /> : <p className="text-sm text-slate-500">Only workforce managers can update this picture.</p>}</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Governance purpose</h2><p className="mt-3 text-sm leading-6 text-slate-600">This profile is the controlled view of training, competency, supervision, appraisal, spot checks and connected governance work. It is not a payroll or general HR record.</p></div>
        </section>

        {canManage ? <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><h2 className="text-lg font-bold text-blue-950">Staff login link</h2><p className="mt-1 mb-4 text-sm text-blue-950">Link exactly one active organisation login to this workforce profile. This controls whose assigned care instructions and understanding checks the worker can access.</p><StaffAccountLinkForm staffId={staff.id} users={organisationUsers.map(({ user }) => user)} currentUserId={staff.userId ?? ""}/></section> : null}

        {canSeeGovernance || canSeeActions ? <section className="grid gap-5 xl:grid-cols-2">
          <GovernanceCard title="Connected governance records" empty="No authorised Incident, Complaint, Safeguarding or other governance record is linked to this worker." items={governanceRecords.map((record) => ({ id: record.id, href: `/registers/${record.definition.key}/${record.id}`, title: `${record.reference} · ${record.title}`, meta: `${record.definition.name} · ${workforceLabel(record.status)} · ${record.riskLevel.toLowerCase()}`, warn: ["HIGH", "CRITICAL"].includes(record.riskLevel) && record.status !== "CLOSED" }))} />
          <GovernanceCard title="Actions and improvement" empty="No authorised Action is linked to this worker." items={actions.map((action) => ({ id: action.id, href: `/actions/${action.id}`, title: `${action.reference} · ${action.title}`, meta: `${workforceLabel(action.lifecycleStatus)} · ${action.priority.toLowerCase()} · due ${date(action.dueDate)}`, warn: !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(action.status) && action.dueDate < now }))} />
        </section> : null}

        {canSeeGovernance ? <GovernanceCard title="Active care-plan assignments" empty="No active governed care-plan assignment is recorded." items={assignments.map((assignment) => ({ id: assignment.id, href: `/care-plans/${assignment.carePlan.id}`, title: `Care Plan ${assignment.carePlan.reference}`, meta: `${workforceLabel(assignment.carePlan.status)}${assignment.requiredCompetencies.length ? ` · required competencies: ${assignment.requiredCompetencies.join(", ")}` : " · no specific competency recorded"}${assignment.carePlan.nextReviewDate ? ` · review ${date(assignment.carePlan.nextReviewDate)}` : ""}` }))} /> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Private staff documents</h2><p className="mt-1 text-sm text-slate-600">Recruitment, training and competency documents linked to this worker and the Evidence Library.</p></div><Link href={`/evidence?relatedModule=StaffMember&relatedRecordId=${staff.id}`} className="text-sm font-semibold text-emerald-700">Open in Evidence Library →</Link></div>{documents.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{documents.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase text-emerald-700">{item.category} · {item.confidentiality.toLowerCase()}</p><h3 className="mt-1 font-bold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.currentVersion?.fileName ?? "System record"}{item.reviewExpiryDate ? ` · review ${date(item.reviewExpiryDate)}` : ""}</p><Link href={`/evidence/${item.id}`} className="mt-3 inline-block text-sm font-semibold text-emerald-700">View controlled record</Link></article>)}</div> : <p className="mt-4 text-sm text-slate-500">No staff documents have been uploaded yet.</p>}{canManage ? <div className="mt-5 border-t border-slate-100 pt-5"><StaffDocumentForm staffId={staff.id} /></div> : null}</section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Compliance and competency history</h2>
          {!staff.records.length ? (
            <p className="mt-3 text-sm text-slate-500">
              No checks, training or competency records have been added yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {staff.records.map((record) => {
                const state = workforceRecordState(record, now);
                return (
                  <article
                    key={record.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                          {workforceLabel(record.type)}
                        </p>
                        <h3 className="mt-1 font-bold">{record.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {record.reference ? `${record.reference} · ` : ""}
                          {workforceLabel(record.outcome)}
                          {record.assessor ? ` · ${record.assessor}` : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          state === "CURRENT"
                            ? "bg-emerald-100 text-emerald-800"
                            : state === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {workforceLabel(state)}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                      <Meta label="Completed" value={date(record.completedDate)} />
                      <Meta label="Expires" value={date(record.expiryDate)} />
                      <Meta label="Next due" value={date(record.nextDueDate)} />
                    </dl>
                    {record.notes ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">
                        {record.notes}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[11px] text-slate-500">
                      Verified by {record.verifiedBy?.name ?? "Not recorded"}
                      {record.verifiedAt ? ` on ${date(record.verifiedAt)}` : ""}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {canManage ? (
          <section id="add-compliance" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Add check, training or competency</h2>
            <p className="mt-1 text-sm text-slate-600">
              Expiry and next-due dates are copied to the Compliance Calendar.
            </p>
            <div className="mt-5">
              <StaffComplianceForm staffId={staff.id} courses={courses} />
            </div>
          </section>
        ) : null}

        <GovernanceTimeline entries={timeline} />

        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-black text-slate-950">Employment administration and leave</summary><p className="mt-2 text-sm text-slate-600">Leave information is retained as supporting workforce administration; it is secondary to the assurance profile above.</p><div className="mt-4 grid gap-3 sm:grid-cols-4"><Info label="Allowance" value={`${allowance} days`} /><Info label="Approved" value={`${annualInYear} days`} /><Info label="Pending" value={`${pendingAnnual} days`} /><Info label="Available" value={`${Math.max(0, allowance - annualInYear)} days`} /></div><p className="mt-3 text-xs text-slate-500">Leave year {date(leaveYear.start)} to {date(new Date(leaveYear.end.getTime() - 86_400_000))}.</p>{staff.leaveRequests.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Type</th><th className="p-3">Dates</th><th className="p-3">Days</th><th className="p-3">Status</th><th className="p-3">Follow-up</th></tr></thead><tbody className="divide-y">{staff.leaveRequests.map((leave) => <tr key={leave.id}><td className="p-3 font-semibold">{workforceLabel(leave.type)}</td><td className="p-3">{date(leave.startDate)} – {date(leave.endDate)}</td><td className="p-3">{Number(leave.requestedDays)}</td><td className="p-3">{workforceLabel(leave.status)}</td><td className="p-3 text-xs text-slate-600">{leave.fitNoteReceived ? "Fit note recorded · " : ""}{leave.returnToWorkCompleted ? "Return-to-work complete" : leave.type === "SICKNESS" ? "Return-to-work not recorded" : leave.decidedBy?.name ? `Decided by ${leave.decidedBy.name}` : "—"}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">No leave or absence records yet.</p>}{canManage ? <div className="mt-5 border-t border-slate-100 pt-5"><StaffLeaveForm staffId={staff.id} /></div> : null}</details>
      </main>
    );
  } finally {
    await db.$disconnect();
  }
}

function ProfileStat({ icon: Icon, label, value, detail, warn = false }: { icon: typeof AlertTriangle; label: string; value: string; detail: string; warn?: boolean }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Icon aria-hidden="true" size={20} className={warn ? "text-amber-700" : "text-emerald-700"} /><p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p><p className={`mt-1 text-xs ${warn ? "font-bold text-amber-800" : "text-slate-500"}`}>{detail}</p></article>;
}

function GovernanceCard({ title, empty, items }: { title: string; empty: string; items: Array<{ id: string; href: string; title: string; meta: string; warn?: boolean }> }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">{title}</h2>{items.length ? <ul className="mt-3 divide-y divide-slate-100">{items.slice(0, 16).map((item) => <li key={item.id} className="py-3"><Link href={item.href} className="font-bold text-emerald-800 hover:underline">{item.title}</Link><p className={`mt-1 text-xs ${item.warn ? "font-bold text-red-700" : "text-slate-500"}`}>{item.meta}</p></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">{empty}</p>}</section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 font-bold">{value}</dd>
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}
function date(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Europe/London",
      }).format(value)
    : "Not set";
}
