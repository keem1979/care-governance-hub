import Link from "next/link";
import { notFound } from "next/navigation";
import { CompleteMockInspectionForm, MockSampleReviewForm } from "@/components/evidence-assurance-controls";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceAssuranceLabel } from "@/lib/evidence-assurance";
import { evidenceScopeWhere } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function MockInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id } = await params;
  const db = createDb();

  try {
    const [inspection, evidence] = await Promise.all([
      db.mockInspection.findFirst({
        where: {
          id,
          organisationId: context.organisation.id,
          ...(context.allLocations
            ? {}
            : {
                OR: [
                  { locationId: null },
                  { locationId: { in: context.locations.map((item) => item.id) } },
                ],
              }),
        },
        include: {
          lead: { select: { name: true } },
          location: { select: { name: true } },
          samples: {
            include: {
              requirement: true,
              reviewedBy: { select: { name: true } },
            },
            orderBy: { requirement: { title: "asc" } },
          },
        },
      }),
      db.evidence.findMany({
        where: { ...evidenceScopeWhere(context), status: "ACTIVE" },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
        take: 1000,
      }),
    ]);

    if (!inspection) notFound();

    const canManage = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
    const completed = inspection.samples.filter(
      (sample) => sample.outcome !== "NOT_TESTED",
    ).length;

    return (
      <main className="space-y-6">
        <header>
          <Link href="/evidence-assurance?view=mock" className="text-sm font-bold text-emerald-800">
            ← Evidence Assurance
          </Link>
          <p className="mt-3 text-xs font-bold uppercase text-emerald-700">
            {inspection.frameworkLabel}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{inspection.title}</h1>
          <p className="mt-2 text-slate-600">{inspection.scope}</p>
          <p className="mt-2 text-sm text-slate-500">
            Lead {inspection.lead.name} · {inspection.location?.name ?? "Organisation-wide"} ·{" "}
            {evidenceAssuranceLabel(inspection.status)} · {completed}/{inspection.samples.length} sampled
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-2">
          {inspection.samples.map((sample) => (
            <article key={sample.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-emerald-700">
                    {evidenceAssuranceLabel(sample.requirement.keyQuestion)}
                  </p>
                  <Link
                    href={`/inspection/${sample.requirement.id}`}
                    className="mt-1 block text-lg font-bold text-emerald-900"
                  >
                    {sample.requirement.title}
                  </Link>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    sample.outcome === "GAP"
                      ? "bg-red-100 text-red-800"
                      : sample.outcome === "ASSURED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {evidenceAssuranceLabel(sample.outcome)}
                </span>
              </div>

              {sample.reviewedBy ? (
                <p className="mt-3 text-xs text-slate-500">
                  Reviewed by {sample.reviewedBy.name} · {date(sample.reviewedAt)}
                </p>
              ) : null}

              {canManage && inspection.status !== "COMPLETED" ? (
                <MockSampleReviewForm
                  inspectionId={id}
                  sampleId={sample.id}
                  evidence={evidence.map((item) => ({ id: item.id, name: item.title }))}
                  initial={{
                    outcome: sample.outcome,
                    sampledEvidenceIds: sample.sampledEvidenceIds,
                    observation: sample.observation ?? "",
                    peopleExperience: sample.peopleExperience ?? "",
                    staffFeedback: sample.staffFeedback ?? "",
                    finding: sample.finding ?? "",
                  }}
                />
              ) : (
                <div className="mt-4 space-y-2 text-sm">
                  <Text label="Observation" value={sample.observation} />
                  <Text label="People's experience" value={sample.peopleExperience} />
                  <Text label="Staff feedback" value={sample.staffFeedback} />
                  <Text label="Finding" value={sample.finding} />
                </div>
              )}
            </article>
          ))}
        </section>

        {canManage && inspection.status !== "COMPLETED" ? (
          <CompleteMockInspectionForm id={id} />
        ) : inspection.summary ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="font-bold">Completed conclusion</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{inspection.summary}</p>
          </section>
        ) : null}
      </main>
    );
  } finally {
    await db.$disconnect();
  }
}

function Text({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <strong>{label}</strong>
      <p className="mt-1 whitespace-pre-wrap text-slate-600">{value ?? "Not recorded"}</p>
    </div>
  );
}

function date(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value)
    : "Not set";
}
