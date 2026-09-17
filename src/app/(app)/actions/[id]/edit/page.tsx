import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { requirePermission } from "@/lib/auth/dal";
import { listActionSources } from "@/lib/action-sources";
import { actionScopeWhere } from "@/lib/actions";
import { clientName } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function EditActionPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, db = createDb();
  try {
    const [action, memberships, sources] = await Promise.all([
      db.action.findFirst({ where: { id, ...actionScopeWhere(context) }, include: { owner: { select: { id: true, name: true } }, oversightOwner: { select: { id: true, name: true } }, client: { select: { id: true, clientReference: true, firstName: true, lastName: true, preferredName: true } }, evidenceLinks: { where: { retiredAt: null }, include: { evidence: { select: { id: true, title: true } } } } } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } }, role: { select: { key: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      listActionSources(db, context),
    ]);
    if (!action) notFound();
    if (action.closedAt) return <main className="mx-auto max-w-3xl space-y-5"><Link href={`/actions/${id}`} className="text-sm font-semibold text-emerald-700">← Back to Action</Link><section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-2xl font-bold text-amber-950">Closed Action is read-only</h1><p className="mt-2 text-sm text-amber-900">Reopen it through the Assurance chronology before changing the live Action. This preserves the attributable closure decision and Evidence history.</p><Link href={`/actions/${id}/assurance`} className="mt-4 inline-block rounded-xl bg-amber-900 px-4 py-2 text-sm font-bold text-white">Open Assurance chronology</Link></section></main>;
    const ownerMembership = memberships.find(({ user }) => user.id === action.ownerId);
    const oversightMembership = memberships.find(({ user }) => user.id === action.oversightOwnerId);
    const ownerOptions = [{ id: action.owner.id, name: action.owner.name, meta: ownerMembership?.role.name }];
    const oversightOptions = action.oversightOwner ? [{ id: action.oversightOwner.id, name: action.oversightOwner.name, meta: oversightMembership?.role.name }] : [];
    const clientOptions = action.client ? [{ id: action.client.id, name: `${action.client.clientReference} · ${clientName(action.client)}` }] : [];
    const evidenceOptions = action.evidenceLinks.map(({ evidence }) => ({ id: evidence.id, name: evidence.title }));
    return <main className="mx-auto max-w-5xl space-y-5"><div><Link href={`/actions/${id}`} className="text-sm font-semibold text-emerald-700">← Back to action</Link><h1 className="mt-2 text-3xl font-bold">Edit improvement action</h1></div><ActionForm locations={context.locations.map(({ id, name }) => ({ id, name }))} owners={ownerOptions} oversightOwners={oversightOptions} clients={clientOptions} evidence={evidenceOptions} sources={sources} initial={{
      id: action.id, reference: action.reference, title: action.title, description: action.description, category: action.category, rootCause: action.rootCause ?? "", expectedOutcome: action.expectedOutcome ?? "", successMeasure: action.successMeasure ?? "", sourceType: action.sourceType, sourceRecordId: action.sourceRecordId ?? "", ownerId: action.ownerId, oversightOwnerId: action.oversightOwnerId ?? "", clientId: action.clientId ?? "", locationId: action.locationId ?? "", priority: action.priority, dueDate: input(action.dueDate), reviewDate: input(action.reviewDate), status: action.status === "OVERDUE" ? "IN_PROGRESS" : action.status, progressPercent: action.progressPercent, progressNote: action.progressNote ?? "", escalationRequired: action.escalationRequired, escalationReason: action.escalationReason ?? "", evidenceRequired: action.evidenceRequired, evidenceWaiverExplanation: action.evidenceWaiverExplanation ?? "", completionDate: input(action.completionDate), verifiedById: action.verifiedById ?? "", verificationDate: input(action.verificationDate), closureNote: action.closureNote ?? "", evidenceIds: action.evidenceLinks.map(({ evidenceId }) => evidenceId), issueKey: action.issueKey ?? "", medicationIssueType: action.medicationIssueType ?? "", managementResponse: action.managementResponse ?? "", completedActionSummary: action.completedActionSummary ?? "", evidenceReviewedSummary: action.evidenceReviewedSummary ?? "", immediateRiskControlled: action.immediateRiskControlled, underlyingRecordCorrected: action.underlyingRecordCorrected, staffSupportCompleted: action.staffSupportCompleted, widerRecordsChecked: action.widerRecordsChecked, recurrenceChecked: action.recurrenceChecked, verificationRationale: action.verificationRationale ?? "", monitoringUntil: input(action.monitoringUntil), nextRecurrenceReviewDate: input(action.nextRecurrenceReviewDate),
    }} /></main>;
  } finally { await db.$disconnect(); }
}
function input(value: Date | null) { return value?.toISOString().slice(0, 10) ?? ""; }
