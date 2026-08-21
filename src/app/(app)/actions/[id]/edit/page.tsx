import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { requirePermission } from "@/lib/auth/dal";
import { listActionSources } from "@/lib/action-sources";
import { actionScopeWhere } from "@/lib/actions";
import { clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";

const OVERSIGHT_ROLES = new Set<string>([ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.OWNER, ROLE_KEYS.NOMINATED_INDIVIDUAL, ROLE_KEYS.QUALITY_MANAGER]);

export default async function EditActionPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, db = createDb();
  try {
    const [action, memberships, clients, evidence, sources] = await Promise.all([
      db.action.findFirst({ where: { id, ...actionScopeWhere(context) }, include: { evidenceLinks: { where: { retiredAt: null } } } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } }, role: { select: { key: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.client.findMany({ where: clientScopeWhere(context), select: { id: true, firstName: true, lastName: true, preferredName: true, clientReference: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 300 }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
      listActionSources(db, context),
    ]);
    if (!action) notFound();
    if (action.closedAt) return <main className="mx-auto max-w-3xl space-y-5"><Link href={`/actions/${id}`} className="text-sm font-semibold text-emerald-700">← Back to Action</Link><section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-2xl font-bold text-amber-950">Closed Action is read-only</h1><p className="mt-2 text-sm text-amber-900">Reopen it through the Assurance chronology before changing the live Action. This preserves the attributable closure decision and Evidence history.</p><Link href={`/actions/${id}/assurance`} className="mt-4 inline-block rounded-xl bg-amber-900 px-4 py-2 text-sm font-bold text-white">Open Assurance chronology</Link></section></main>;
    const oversight = memberships.filter((item) => OVERSIGHT_ROLES.has(item.role.key));
    const oversightOptions = (oversight.length ? oversight : memberships).map((item) => ({ id: item.user.id, name: `${item.user.name} · ${item.role.name}` }));
    return <main className="mx-auto max-w-5xl space-y-5"><div><Link href={`/actions/${id}`} className="text-sm font-semibold text-emerald-700">← Back to action</Link><h1 className="mt-2 text-3xl font-bold">Edit improvement action</h1></div><ActionForm locations={context.locations.map(({ id, name }) => ({ id, name }))} owners={memberships.map(({ user }) => user)} oversightOwners={oversightOptions} clients={clients.map((client) => ({ id: client.id, name: `${client.clientReference} · ${clientName(client)}` }))} evidence={evidence.map(({ id: evidenceId, title }) => ({ id: evidenceId, name: title }))} sources={sources} initial={{
      id: action.id, reference: action.reference, title: action.title, description: action.description, category: action.category, rootCause: action.rootCause ?? "", expectedOutcome: action.expectedOutcome ?? "", successMeasure: action.successMeasure ?? "", sourceType: action.sourceType, sourceRecordId: action.sourceRecordId ?? "", ownerId: action.ownerId, oversightOwnerId: action.oversightOwnerId ?? "", clientId: action.clientId ?? "", locationId: action.locationId ?? "", priority: action.priority, dueDate: input(action.dueDate), reviewDate: input(action.reviewDate), status: action.status === "OVERDUE" ? "IN_PROGRESS" : action.status, progressPercent: action.progressPercent, progressNote: action.progressNote ?? "", escalationRequired: action.escalationRequired, escalationReason: action.escalationReason ?? "", evidenceRequired: action.evidenceRequired, evidenceWaiverExplanation: action.evidenceWaiverExplanation ?? "", completionDate: input(action.completionDate), verifiedById: action.verifiedById ?? "", verificationDate: input(action.verificationDate), closureNote: action.closureNote ?? "", evidenceIds: action.evidenceLinks.map(({ evidenceId }) => evidenceId), issueKey: action.issueKey ?? "", medicationIssueType: action.medicationIssueType ?? "", managementResponse: action.managementResponse ?? "", completedActionSummary: action.completedActionSummary ?? "", evidenceReviewedSummary: action.evidenceReviewedSummary ?? "", immediateRiskControlled: action.immediateRiskControlled, underlyingRecordCorrected: action.underlyingRecordCorrected, staffSupportCompleted: action.staffSupportCompleted, widerRecordsChecked: action.widerRecordsChecked, recurrenceChecked: action.recurrenceChecked, verificationRationale: action.verificationRationale ?? "", monitoringUntil: input(action.monitoringUntil), nextRecurrenceReviewDate: input(action.nextRecurrenceReviewDate),
    }} /></main>;
  } finally { await db.$disconnect(); }
}
function input(value: Date | null) { return value?.toISOString().slice(0, 10) ?? ""; }
