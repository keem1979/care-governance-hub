import Link from "next/link";
import { CompetencyRequirementForm, RemoveCompetencyRequirement, UnderstandingReviewForm } from "@/components/care-assurance-controls";
import { requireAnyPermission } from "@/lib/auth/dal";
import { assuranceLabel, competencyMatchState } from "@/lib/care-workforce-assurance";
import { carePlanScopeWhere } from "@/lib/care-plans";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function CareAssurancePage() {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT]);
  const db = createDb();
  try {
    const canManage = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT) || hasPermission(context.permissions, PERMISSIONS.WORKFORCE_MANAGE);
    const broadView = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW) || hasPermission(context.permissions, PERMISSIONS.WORKFORCE_VIEW) || hasPermission(context.permissions, PERMISSIONS.WORKFORCE_MANAGE);
    const linkedStaff = await db.staffMember.findFirst({ where: { organisationId: context.organisation.id, userId: context.user.id, archivedAt: null }, select: { id: true, firstName: true, lastName: true } });
    const plans = await db.carePlan.findMany({
      where: { ...carePlanScopeWhere(context), currentVersionId: { not: null }, currentVersion: { status: "PUBLISHED" } },
      include: {
        currentVersion: { include: { competencyRequirements: { include: { trainingCourse: { select: { title: true } } } }, acknowledgementRequirements: { include: { staffMember: { select: { id: true, firstName: true, lastName: true, preferredName: true, userId: true } }, acknowledgement: true, understandingCheck: true } } } },
        assignments: { where: { isActive: true }, include: { staffMember: { select: { id: true, firstName: true, lastName: true, preferredName: true, userId: true } } } },
      },
      orderBy: [{ nextReviewDate: "asc" }, { reference: "asc" }],
    });
    const visiblePlans = broadView ? plans : plans.filter((plan) => linkedStaff && plan.assignments.some((assignment) => assignment.staffMemberId === linkedStaff.id && (assignment.versionId === plan.currentVersionId || assignment.versionId === null)));
    const clientIds = [...new Set(visiblePlans.map((plan) => plan.clientId))];
    const clients = clientIds.length ? await db.client.findMany({ where: { organisationId: context.organisation.id, id: { in: clientIds } }, select: { id: true, firstName: true, preferredName: true, clientReference: true } }) : [];
    const clientById = new Map(clients.map((client) => [client.id, client]));
    const activeAssignments = visiblePlans.flatMap((plan) => plan.assignments.filter((assignment) => (assignment.versionId === plan.currentVersionId || assignment.versionId === null) && (broadView || assignment.staffMemberId === linkedStaff?.id)));
    const staffIds = [...new Set(activeAssignments.map((assignment) => assignment.staffMemberId))];
    const records = staffIds.length ? await db.staffComplianceRecord.findMany({
      where: { organisationId: context.organisation.id, staffMemberId: { in: staffIds }, type: { in: ["TRAINING", "COMPETENCY"] }, trainingCourseId: { not: null } },
      select: { staffMemberId: true, trainingCourseId: true, outcome: true, verifiedAt: true, expiryDate: true, completedDate: true, createdAt: true },
      orderBy: [{ completedDate: "desc" }, { createdAt: "desc" }],
    }) : [];
    const latestRecord = new Map<string, (typeof records)[number]>();
    for (const record of records) {
      const key = `${record.staffMemberId}:${record.trainingCourseId}`;
      if (!latestRecord.has(key)) latestRecord.set(key, record);
    }
    const courses = canManage ? await db.trainingCourse.findMany({ where: { archivedAt: null, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] }, select: { id: true, title: true }, orderBy: { title: "asc" } }) : [];
    const requirements = visiblePlans.flatMap((plan) => (plan.currentVersion?.acknowledgementRequirements ?? []).filter((item) => broadView || item.staffMemberId === linkedStaff?.id));
    const checksAwaitingReview = requirements.filter((item) => item.understandingCheck?.outcome === "AWAITING_REVIEW");
    const now = new Date();
    const overdue = requirements.filter((item) => !["COMPLETE", "EXEMPT"].includes(item.status) && item.dueAt < now);
    const competencyMatches = visiblePlans.flatMap((plan) => {
      const version = plan.currentVersion;
      if (!version) return [];
      const assigned = plan.assignments.filter((item) => (item.versionId === version.id || item.versionId === null) && (broadView || item.staffMemberId === linkedStaff?.id));
      return version.competencyRequirements.flatMap((requirement) => assigned.map((assignment) => ({ plan, requirement, assignment, state: competencyMatchState(latestRecord.get(`${assignment.staffMemberId}:${requirement.trainingCourseId}`), now) })));
    });
    const gaps = competencyMatches.filter((item) => item.state !== "CURRENT");
    const criticalGaps = gaps.filter((item) => item.requirement.critical);

    if (!broadView && !linkedStaff) return <main className="mx-auto max-w-2xl"><section className="rounded-2xl border border-amber-300 bg-amber-50 p-6"><h1 className="text-2xl font-bold">Your staff profile is not linked</h1><p className="mt-2 text-sm text-amber-950">A workforce manager must link your login to the correct staff profile before person-specific care instructions can be shown.</p></section></main>;

    return <main className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Phase 5 · care and workforce assurance</p><h1 className="mt-1 text-3xl font-bold">Care Assurance</h1><p className="mt-2 max-w-3xl text-slate-600">One safe view of approved care instructions, staff acknowledgement, understanding checks and verified competency matching. Draft instructions are excluded.</p></header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Approved current plans" value={visiblePlans.length} tone="emerald"/><Metric label="Acknowledgements overdue" value={overdue.length} tone={overdue.length ? "red" : "emerald"}/><Metric label="Checks awaiting review" value={checksAwaitingReview.length} tone={checksAwaitingReview.length ? "amber" : "emerald"}/><Metric label="Critical competency gaps" value={criticalGaps.length} tone={criticalGaps.length ? "red" : "emerald"}/></section>
      {checksAwaitingReview.length && canManage ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-xl font-bold text-amber-950">Understanding checks requiring a manager decision</h2><div className="mt-4 grid gap-4 xl:grid-cols-2">{checksAwaitingReview.map((item) => <article key={item.id} className="rounded-xl border border-amber-200 bg-white p-4"><p className="text-xs font-bold uppercase text-amber-800">{item.carePlanId === visiblePlans.find((plan) => plan.id === item.carePlanId)?.id ? visiblePlans.find((plan) => plan.id === item.carePlanId)?.reference : "Care plan"}</p><h3 className="mt-1 font-bold">{staffName(item.staffMember)}</h3><p className="mt-2 text-sm text-slate-700"><strong>Prompt:</strong> {item.understandingCheck?.prompt}</p><p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm"><strong>Worker response:</strong> {item.understandingCheck?.staffResponse}</p>{item.understandingCheck ? <UnderstandingReviewForm carePlanId={item.carePlanId} checkId={item.understandingCheck.id}/> : null}</article>)}</div></section> : null}
      {!visiblePlans.length ? <section className="rounded-2xl border border-dashed bg-white p-10 text-center"><h2 className="font-bold">No approved care plans are available</h2><p className="mt-1 text-sm text-slate-600">Only a published current version can appear in Care Assurance.</p></section> : <section className="grid gap-5 xl:grid-cols-2">{visiblePlans.map((plan) => {
        const version = plan.currentVersion!;
        const assigned = plan.assignments.filter((item) => (item.versionId === version.id || item.versionId === null) && (broadView || item.staffMemberId === linkedStaff?.id));
        const planRequirements = version.acknowledgementRequirements.filter((item) => broadView || item.staffMemberId === linkedStaff?.id);
        const completed = planRequirements.filter((item) => item.status === "COMPLETE").length;
        const client = clientById.get(plan.clientId);
        return <article key={plan.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b bg-gradient-to-r from-emerald-950 to-emerald-700 p-5 text-white"><p className="text-xs font-bold uppercase tracking-wide">{plan.reference} · Approved v{version.versionNumber}</p><h2 className="mt-1 text-xl font-bold">{client?.preferredName?.trim() || client?.firstName || "Service user"}</h2><p className="mt-1 text-xs text-emerald-100">Client ref {client?.clientReference ?? "controlled profile"} · {plan.overallRisk.toLowerCase()} risk</p></div><div className="space-y-5 p-5"><div className="grid grid-cols-3 gap-2 text-center"><Mini label="Assigned" value={assigned.length}/><Mini label="Complete" value={completed}/><Mini label="Gaps" value={competencyMatches.filter((item) => item.plan.id === plan.id && item.state !== "CURRENT").length}/></div><div className="flex flex-wrap gap-2"><Link href={`/care-plans/${plan.id}/quick-guide`} className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white">Open approved staff view</Link>{broadView ? <Link href={`/care-plans/${plan.id}`} className="rounded-xl border px-4 py-2 text-sm font-bold">Full controlled plan</Link> : null}</div><section><h3 className="font-bold">Assigned staff assurance</h3><div className="mt-3 space-y-2">{assigned.length ? assigned.map((assignment) => { const item = planRequirements.find((requirement) => requirement.staffMemberId === assignment.staffMemberId); return <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm"><div><strong>{staffName(assignment.staffMember)}</strong><p className="text-xs text-slate-500">{assignment.staffMember.userId ? "Login linked" : "Login not linked"}</p></div><Status value={item?.status ?? "NOT_REQUIRED"} danger={Boolean(item && !["COMPLETE", "EXEMPT"].includes(item.status) && item.dueAt < now)}/></div>; }) : <p className="text-sm text-slate-500">No staff assigned to this approved version.</p>}</div></section><section><h3 className="font-bold">Competency requirements</h3>{version.competencyRequirements.length ? <div className="mt-3 space-y-3">{version.competencyRequirements.map((requirement) => <div key={requirement.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><div><strong>{requirement.label}</strong><p className="mt-1 text-xs text-slate-600">{requirement.instructions}</p></div>{canManage ? <RemoveCompetencyRequirement carePlanId={plan.id} requirementId={requirement.id}/> : null}</div><div className="mt-3 flex flex-wrap gap-2">{competencyMatches.filter((match) => match.plan.id === plan.id && match.requirement.id === requirement.id).map((match) => <span key={match.assignment.id} className={`rounded-full px-2.5 py-1 text-xs font-bold ${match.state === "CURRENT" ? "bg-emerald-100 text-emerald-800" : match.state === "EXPIRING_SOON" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{staffName(match.assignment.staffMember)} · {assuranceLabel(match.state)}</span>)}</div></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No formal care-linked competency requirements recorded.</p>}{canManage ? <div className="mt-4 border-t pt-4"><CompetencyRequirementForm carePlanId={plan.id} courses={courses}/><p className="mt-2 text-xs text-slate-500">This matching aid does not authorise deployment. A manager must verify the person, instruction and workforce evidence.</p></div> : null}</section></div></article>;
      })}</section>}
      {gaps.length ? <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-900">{gaps.length} competency match{gaps.length === 1 ? "" : "es"} need review. “Not recorded” and “not verified” are treated as gaps; the system does not infer competence.</p> : null}
    </main>;
  } finally { await db.$disconnect(); }
}

function staffName(staff: { firstName: string; lastName: string; preferredName: string | null }) { return `${staff.preferredName?.trim() || staff.firstName} ${staff.lastName}`; }
function Metric({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "red" }) { const classes = tone === "red" ? "border-red-200 bg-red-50 text-red-900" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"; return <article className={`rounded-2xl border p-5 ${classes}`}><p className="text-xs font-bold uppercase tracking-wide">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>; }
function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{value}</p><p className="text-[11px] font-bold uppercase text-slate-500">{label}</p></div>; }
function Status({ value, danger }: { value: string; danger: boolean }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${danger || ["SUPPORT_REQUIRED", "REQUIRED"].includes(value) ? "bg-red-100 text-red-800" : value === "COMPLETE" || value === "EXEMPT" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{danger ? "Overdue · " : ""}{assuranceLabel(value)}</span>; }
