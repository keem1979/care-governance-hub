import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  UserRoundCheck,
} from "lucide-react";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  workforceLabel,
  workforceRecordState,
  workforceScopeWhere,
} from "@/lib/workforce";

export default async function WorkforcePage() {
  const context = await requireAnyPermission([
    PERMISSIONS.WORKFORCE_VIEW,
    PERMISSIONS.WORKFORCE_MANAGE,
  ]);
  const db = createDb();
  try {
    const staff = await db.staffMember.findMany({
      where: workforceScopeWhere(context),
      include: {
        location: { select: { name: true } },
        records: {
          orderBy: [{ expiryDate: "asc" }, { nextDueDate: "asc" }],
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 250,
    });
    const records = staff.flatMap(({ records: items }) => items);
    const now = new Date();
    const inThirtyDays = new Date(now.getTime() + 30 * 86_400_000);
    const overdue = records.filter(
      (record) => workforceRecordState(record, now) === "OVERDUE",
    ).length;
    const dueSoon = records.filter((record) => {
      const due = record.expiryDate ?? record.nextDueDate;
      return due && due >= now && due <= inThirtyDays;
    }).length;
    const competencyActions = records.filter(
      (record) =>
        record.type === "COMPETENCY" &&
        ["PENDING", "DEVELOPMENT_REQUIRED"].includes(record.outcome),
    ).length;
    const canManage = hasPermission(
      context.permissions,
      PERMISSIONS.WORKFORCE_MANAGE,
    );

    return (
      <main className="space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              Workforce assurance
            </p>
            <h1 className="text-3xl font-bold">Staff Compliance & Competency</h1>
            <p className="mt-1 max-w-3xl text-slate-600">
              Track safer recruitment checks, training, competencies,
              professional registrations, supervision, appraisals and spot checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-3"><Link href="/workforce/training" className="rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-800">Training matrix</Link>{canManage ? <Link href="/workforce/new" className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Add staff record</Link> : null}</div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={UserRoundCheck} label="Active staff" value={staff.filter(({ employmentStatus }) => employmentStatus === "ACTIVE").length} />
          <Stat icon={AlertTriangle} label="Overdue checks" value={overdue} warn={overdue > 0} />
          <Stat icon={CalendarClock} label="Due within 30 days" value={dueSoon} warn={dueSoon > 0} />
          <Stat icon={GraduationCap} label="Competency actions" value={competencyActions} warn={competencyActions > 0} />
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex gap-3">
            <BadgeCheck className="mt-0.5 shrink-0 text-emerald-700" size={21} />
            <div>
              <h2 className="font-bold text-emerald-950">How the tracker works</h2>
              <p className="mt-1 text-sm leading-6 text-emerald-950/75">
                Add a staff record, then record each check, course, competency,
                supervision, appraisal or spot check. Expiry and next-due dates
                also appear in the Compliance Calendar for follow-up.
              </p>
            </div>
          </div>
        </section>

        {!staff.length ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="font-bold">No workforce records yet</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add the first staff record to begin the compliance matrix.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Staff member</th>
                    <th className="px-4 py-3">Role and location</th>
                    <th className="px-4 py-3">Records</th>
                    <th className="px-4 py-3">Current</th>
                    <th className="px-4 py-3">Needs attention</th>
                    <th className="px-4 py-3">Next deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((person) => {
                    const attention = person.records.filter((record) =>
                      ["OVERDUE", "ACTION_REQUIRED", "PENDING"].includes(
                        workforceRecordState(record, now),
                      ),
                    ).length;
                    const current = person.records.length - attention;
                    const deadlines = person.records
                      .flatMap((record) =>
                        [record.expiryDate, record.nextDueDate].filter(
                          (value): value is Date => Boolean(value && value >= now),
                        ),
                      )
                      .sort((a, b) => a.getTime() - b.getTime());
                    return (
                      <tr key={person.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <Link
                            href={`/workforce/${person.id}`}
                            className="font-bold text-emerald-800 hover:underline"
                          >
                            {person.firstName} {person.lastName}
                          </Link>
                          <p className="mt-1 font-mono text-xs text-slate-500">
                            Staff {person.staffNumber} · {person.employeeReference}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{person.jobTitle}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {person.location?.name ?? "Organisation-wide"} ·{" "}
                            {workforceLabel(person.employmentStatus)}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-semibold">{person.records.length}</td>
                        <td className="px-4 py-4 text-emerald-700">{current}</td>
                        <td className={`px-4 py-4 font-bold ${attention ? "text-red-700" : "text-slate-500"}`}>
                          {attention}
                        </td>
                        <td className="px-4 py-4">
                          {deadlines[0] ? date(deadlines[0]) : "Not set"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {staff.length === 250 ? (
          <p className="text-xs text-slate-500">
            Showing the first 250 staff records. Use organisation and location
            structures to keep workforce registers manageable.
          </p>
        ) : null}
      </main>
    );
  } finally {
    await db.$disconnect();
  }
}

function Stat({
  icon: Icon,
  label,
  value,
  warn = false,
}: {
  icon: typeof UserRoundCheck;
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className={warn ? "text-red-700" : "text-emerald-700"} size={20} />
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </article>
  );
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(value);
}
