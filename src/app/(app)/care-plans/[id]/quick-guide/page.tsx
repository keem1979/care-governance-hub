import Link from "next/link";
import { notFound } from "next/navigation";
import { UnderstandingResponseForm } from "@/components/care-assurance-controls";
import { AcknowledgeCarePlan } from "@/components/care-plan-controls";
import { CarePlanView } from "@/components/care-plan-view";
import { requireAnyPermission } from "@/lib/auth/dal";
import { loadCarePlan } from "@/lib/care-plan-data";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function QuickGuide({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ASSIGNED_TASKS_EDIT]);
  const { id } = await params;
  const db = createDb();
  try {
    const loaded = await loadCarePlan(db, context, id);
    if (!loaded) notFound();
    if (!loaded.current) return <main className="mx-auto max-w-2xl p-6"><section className="rounded-2xl border border-amber-300 bg-amber-50 p-6"><h1 className="text-2xl font-bold">Approved instructions are not available</h1><p className="mt-2 text-amber-950">This care plan has no approved current version. Draft or proposed instructions are never shown in the staff quick guide.</p><Link href="/care-assurance" className="mt-4 inline-block font-bold text-emerald-800">Return to Care Assurance</Link></section></main>;
    const staff = await db.staffMember.findFirst({ where: { organisationId: context.organisation.id, userId: context.user.id, archivedAt: null }, select: { id: true } });
    if (!hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW)) {
      if (!staff) notFound();
      const assigned = await db.carePlanStaffAssignment.findFirst({ where: { carePlanId: id, staffMemberId: staff.id, isActive: true, OR: [{ versionId: loaded.current.id }, { versionId: null }] } });
      if (!assigned) notFound();
    }
    const [currentAcknowledgements, requirement] = await Promise.all([
      db.carePlanAcknowledgement.findMany({ where: { carePlanId: id, versionId: loaded.current.id }, select: { userId: true, acknowledgedAt: true } }),
      staff ? db.acknowledgementRequirement.findUnique({ where: { versionId_staffMemberId: { versionId: loaded.current.id, staffMemberId: staff.id } }, include: { understandingCheck: true, acknowledgement: true } }) : null,
    ]);
    const acknowledgementUsers = currentAcknowledgements.length ? await db.user.findMany({ where: { id: { in: currentAcknowledgements.map((item) => item.userId) } }, select: { id: true, name: true } }) : [];
    const acknowledgementNames = new Map(acknowledgementUsers.map((item) => [item.id, item.name]));
    const acknowledgements = currentAcknowledgements.map((item) => ({ name: acknowledgementNames.get(item.userId) ?? "Authorised staff", at: item.acknowledgedAt }));
    const submitted = requirement?.understandingCheck?.outcome === "AWAITING_REVIEW" || requirement?.status === "COMPLETE";
    return <main className="bg-white p-4 sm:p-6"><div className="mx-auto mb-4 max-w-5xl rounded-xl bg-emerald-800 p-3 text-center text-sm font-bold text-white print:hidden">Live approved staff quick view · Care Plan {loaded.plan.reference} · Version {loaded.current.versionNumber}</div><CarePlanView plan={loaded.plan} version={loaded.current} person={loaded.person} organisation={{ name: context.organisation.name, hasLogo: Boolean(context.organisation.policyLogoStorageKey) }} location={loaded.location} coordinator={loaded.coordinator} manager={loaded.manager} actions={loaded.actions} evidence={loaded.evidence} acknowledgements={acknowledgements} quick/><div className="mx-auto mt-5 max-w-5xl space-y-4 print:hidden">{requirement && !requirement.acknowledgement ? <AcknowledgeCarePlan id={id}/> : null}{requirement?.requiresUnderstandingCheck && requirement.understandingCheck ? <UnderstandingResponseForm carePlanId={id} prompt={requirement.understandingCheck.prompt} submitted={submitted}/> : null}</div></main>;
  } finally {
    await db.$disconnect();
  }
}
