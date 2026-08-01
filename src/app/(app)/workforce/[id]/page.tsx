import Link from "next/link";
import { notFound } from "next/navigation";
import { StaffComplianceForm } from "@/components/workforce-forms";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  workforceLabel,
  workforceRecordState,
  workforceScopeWhere,
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
      },
    });
    if (!staff) notFound();
    const canManage = hasPermission(
      context.permissions,
      PERMISSIONS.WORKFORCE_MANAGE,
    );
    const now = new Date();

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
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Department" value={staff.department ?? "Not set"} />
          <Info label="Line manager" value={staff.lineManager ?? "Not set"} />
          <Info label="Start date" value={date(staff.startDate)} />
          <Info label="Compliance records" value={String(staff.records.length)} />
        </section>

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
              <StaffComplianceForm staffId={staff.id} />
            </div>
          </section>
        ) : null}
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
