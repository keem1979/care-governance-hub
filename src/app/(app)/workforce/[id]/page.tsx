import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { StaffComplianceForm, StaffDocumentForm, StaffLeaveForm, StaffPhotoForm } from "@/components/workforce-forms";
import { StaffAccountLinkForm } from "@/components/care-assurance-controls";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
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
    const [documents, courses, organisationUsers] = await Promise.all([
      db.evidence.findMany({ where: { organisationId: context.organisation.id, relatedModule: "StaffMember", relatedRecordId: id, archivedAt: null }, include: { currentVersion: { select: { id: true, fileName: true } } }, orderBy: { createdAt: "desc" } }),
      db.trainingCourse.findMany({ where: { archivedAt: null, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] }, select: { id: true, title: true, suggestedRenewalMonths: true }, orderBy: { title: "asc" } }),
      canManage ? db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE", user: { status: "ACTIVE" } }, select: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: "asc" } } }) : Promise.resolve([]),
    ]);
    const now = new Date();
    const leaveYear = leaveYearRange(staff.leaveYearStartMonth, staff.leaveYearStartDay, now);
    const annualInYear = staff.leaveRequests.filter((leave) => leave.type === "ANNUAL" && leave.status === "APPROVED" && leave.startDate >= leaveYear.start && leave.startDate < leaveYear.end).reduce((sum, leave) => sum + Number(leave.requestedDays), 0);
    const pendingAnnual = staff.leaveRequests.filter((leave) => leave.type === "ANNUAL" && leave.status === "PENDING" && leave.startDate >= leaveYear.start && leave.startDate < leaveYear.end).reduce((sum, leave) => sum + Number(leave.requestedDays), 0);
    const allowance = Number(staff.annualLeaveEntitlementDays) + Number(staff.annualLeaveCarryOverDays);

    return (
      <main className="space-y-6">
        <header>
          <Link href="/workforce" className="text-sm font-semibold text-emerald-700">
            ← Staff Compliance & Competency
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm text-emerald-700">
                Staff {staff.staffNumber} · {staff.employeeReference}
              </p>
              <h1 className="text-3xl font-bold">
                {staff.firstName} {staff.lastName}
              </h1>
              <p className="mt-1 text-slate-600">
                {staff.jobTitle} · {staff.location?.name ?? "Organisation-wide"} ·{" "}
                {workforceLabel(staff.employmentStatus)}
              </p>
            </div>
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-emerald-100 shadow"><Image unoptimized fill className="object-cover" sizes="96px" src={staff.profilePhotoKey ? `/api/workforce/${staff.id}/photo` : "/abi-avatar.png"} alt={`${staff.firstName} ${staff.lastName} profile`} /></div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Department" value={staff.department ?? "Not set"} />
          <Info label="Line manager" value={staff.lineManager ?? "Not set"} />
          <Info label="Start date" value={date(staff.startDate)} />
          <Info label="Compliance records" value={String(staff.records.length)} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Staff profile picture</h2><p className="mt-1 mb-4 text-sm text-slate-600">Helps managers identify the correct profile. It is never shown publicly.</p>{canManage ? <StaffPhotoForm staffId={staff.id} /> : <p className="text-sm text-slate-500">Only workforce managers can update this picture.</p>}</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2"><h2 className="font-bold">Annual leave balance</h2><div className="mt-4 grid gap-3 sm:grid-cols-4"><Info label="Allowance" value={`${allowance} days`} /><Info label="Approved" value={`${annualInYear} days`} /><Info label="Pending" value={`${pendingAnnual} days`} /><Info label="Available" value={`${Math.max(0, allowance - annualInYear)} days`} /></div><p className="mt-3 text-xs text-slate-500">Leave year {date(leaveYear.start)} to {date(new Date(leaveYear.end.getTime() - 86_400_000))}. Balance uses recorded entitlement and approved annual leave.</p></div>
        </section>

        {canManage ? <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><h2 className="text-lg font-bold text-blue-950">Staff login link</h2><p className="mt-1 mb-4 text-sm text-blue-950">Link exactly one active organisation login to this workforce profile. This controls whose assigned care instructions and understanding checks the worker can access.</p><StaffAccountLinkForm staffId={staff.id} users={organisationUsers.map(({ user }) => user)} currentUserId={staff.userId ?? ""}/></section> : null}

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
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Add check, training or competency</h2>
            <p className="mt-1 text-sm text-slate-600">
              Expiry and next-due dates are copied to the Compliance Calendar.
            </p>
            <div className="mt-5">
              <StaffComplianceForm staffId={staff.id} courses={courses} />
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Leave and absence history</h2><p className="mt-1 text-sm text-slate-600">Annual leave, sickness and family or organisational leave are kept together on this profile.</p>{staff.leaveRequests.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Type</th><th className="p-3">Dates</th><th className="p-3">Days</th><th className="p-3">Status</th><th className="p-3">Follow-up</th></tr></thead><tbody className="divide-y">{staff.leaveRequests.map((leave) => <tr key={leave.id}><td className="p-3 font-semibold">{workforceLabel(leave.type)}</td><td className="p-3">{date(leave.startDate)} – {date(leave.endDate)}</td><td className="p-3">{Number(leave.requestedDays)}</td><td className="p-3">{workforceLabel(leave.status)}</td><td className="p-3 text-xs text-slate-600">{leave.fitNoteReceived ? "Fit note recorded · " : ""}{leave.returnToWorkCompleted ? "Return-to-work complete" : leave.type === "SICKNESS" ? "Return-to-work not recorded" : leave.decidedBy?.name ? `Decided by ${leave.decidedBy.name}` : "—"}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">No leave or absence records yet.</p>}{canManage ? <div className="mt-5 border-t border-slate-100 pt-5"><StaffLeaveForm staffId={staff.id} /></div> : null}</section>
      </main>
    );
  } finally {
    await db.$disconnect();
  }
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
