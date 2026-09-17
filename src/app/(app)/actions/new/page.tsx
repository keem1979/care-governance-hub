import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { requirePermission } from "@/lib/auth/dal";
import { listActionSources } from "@/lib/action-sources";
import { createDb } from "@/lib/db";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";
import { riskActionPrefill } from "@/lib/risk-action-handoff";
import { auditFindingActionPrefill } from "@/lib/audit-action-handoff";
import { incidentActionPrefill } from "@/lib/incident-action-handoff";
import { complaintActionPrefill } from "@/lib/complaint-action-handoff";
import { safeguardingActionPrefill } from "@/lib/safeguarding-action-handoff";
import { riskScopeWhere } from "@/lib/risks";
import { registerScopeWhere } from "@/lib/registers";
import { clientName, clientScopeWhere } from "@/lib/clients";

const OVERSIGHT_ROLES = new Set<string>([
  ROLE_KEYS.REGISTERED_MANAGER,
  ROLE_KEYS.OWNER,
  ROLE_KEYS.NOMINATED_INDIVIDUAL,
  ROLE_KEYS.QUALITY_MANAGER,
]);

export default async function NewActionPage({ searchParams }: { searchParams: Promise<{ sourceType?: string; sourceId?: string; issueId?: string; clientId?: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE);
  const query = await searchParams;
  const db = createDb();
  try {
    const [memberships, sources, sourceRisk, sourceAuditFinding, sourceIncident, sourceComplaint, sourceSafeguarding, profileClient] = await Promise.all([
      db.organisationMembership.findMany({
        where: { organisationId: context.organisation.id, status: "ACTIVE" },
        select: { user: { select: { id: true, name: true } }, role: { select: { key: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      }),
      listActionSources(db, context),
      query.sourceType === "RISK" && query.sourceId ? db.risk.findFirst({ where: { id: query.sourceId, ...riskScopeWhere(context), archivedAt: null }, select: { reference: true, title: true, category: true, furtherControls: true, locationId: true, ownerId: true, targetDate: true, residualLevel: true, residualScore: true, targetScore: true, controlAssurance: true } }) : null,
      query.sourceType === "AUDIT" && query.sourceId ? db.auditFinding.findFirst({ where: { id: query.sourceId, audit: auditScope(context) }, select: { id: true, severity: true, summary: true, recommendation: true, immediateControl: true, criterionKeySnapshot: true, actionId: true, audit: { select: { title: true, locationId: true, reviewDate: true, auditorId: true } } } }) : null,
      query.sourceType === "INCIDENT" && query.sourceId ? db.registerEntry.findFirst({ where: { id: query.sourceId, ...registerScopeWhere(context), definition: { key: "incidents" }, archivedAt: null }, select: { reference: true, title: true, summary: true, riskLevel: true, locationId: true, ownerId: true, eventDate: true, data: true } }) : null,
      query.sourceType === "COMPLAINT" && query.sourceId ? db.registerEntry.findFirst({ where: { id: query.sourceId, ...registerScopeWhere(context), definition: { key: "complaints" }, archivedAt: null }, select: { reference: true, title: true, summary: true, riskLevel: true, locationId: true, ownerId: true, data: true, complaintInvestigation: { select: { remedy: true, learning: true, investigationOutcome: true } }, complaintIssues: { select: { id: true, sequence: true, category: true, concern: true, reasoning: true }, orderBy: { sequence: "asc" } } } }) : null,
      query.sourceType === "SAFEGUARDING" && query.sourceId ? db.registerEntry.findFirst({ where: { id: query.sourceId, ...registerScopeWhere(context), definition: { key: "safeguarding" }, archivedAt: null }, select: { reference: true, title: true, summary: true, riskLevel: true, locationId: true, ownerId: true, safeguardingCase: { select: { findings: true, outcome: true, learning: true, immediateControl: true } } } }) : null,
      query.clientId && !query.sourceId ? db.client.findFirst({ where: { id: query.clientId, ...clientScopeWhere(context) }, select: { id: true, clientReference: true, clientNumber: true, firstName: true, preferredName: true, lastName: true, locationId: true } }) : null,
    ]);
    const requested = query.sourceType && query.sourceId ? `${query.sourceType}:${query.sourceId}` : undefined;
    const preselected = requested && sources.some((item) => `${item.type}:${item.id}` === requested) ? requested : undefined;
    const oversight = memberships.filter((item) => OVERSIGHT_ROLES.has(item.role.key));
    const oversightOptions = oversight.map((item) => ({ id: item.user.id, name: `${item.user.name} · ${item.role.name}` }));
    const oversightIds = new Set(oversightOptions.map(({ id }) => id));
    const prefill = sourceRisk ? riskActionPrefill(sourceRisk, context.user.id, oversightIds) : sourceAuditFinding ? auditFindingActionPrefill(sourceAuditFinding, context.user.id, oversightIds) : sourceIncident ? incidentActionPrefill(sourceIncident, context.user.id, oversightIds) : sourceComplaint ? complaintActionPrefill(sourceComplaint, context.user.id, oversightIds, query.issueId) : sourceSafeguarding ? safeguardingActionPrefill(sourceSafeguarding, context.user.id, oversightIds) : undefined;
    const prefillValues = prefill as (Record<string, unknown> & { oversightOwnerId?: string; locationId?: string; clientId?: string }) | undefined;
    const safePrefill = { ...(prefill ?? {}), clientId: prefillValues?.clientId ?? profileClient?.id ?? "", locationId: prefillValues?.locationId ?? profileClient?.locationId ?? "", oversightOwnerId: prefillValues?.oversightOwnerId ?? (oversightIds.has(context.user.id) ? context.user.id : "") };
    const initialIds = new Set([String(safePrefill.ownerId ?? ""), String(safePrefill.oversightOwnerId ?? "")].filter(Boolean));
    const initialOwners = memberships.filter(({ user }) => initialIds.has(user.id)).map(({ user, role }) => ({ id: user.id, name: user.name, meta: role.name }));
    const initialOversight = oversightOptions.filter(({ id }) => initialIds.has(id));

    return <main className="mx-auto max-w-5xl space-y-5">
      <div><Link href="/actions" className="text-sm font-semibold text-emerald-700">← Action Tracker</Link><h1 className="mt-2 text-3xl font-bold">Create improvement action</h1><p className="mt-1 text-slate-600">Create one accountable record that remains connected to its source, delivery owner, Registered Manager oversight, evidence, calendar and reports.</p></div>
      <ActionForm
        locations={context.locations.map(({ id, name }) => ({ id, name }))}
        owners={initialOwners}
        oversightOwners={initialOversight}
        clients={profileClient ? [{ id: profileClient.id, name: `${clientName(profileClient)} · Client ${profileClient.clientNumber} · ${profileClient.clientReference}` }] : []}
        evidence={[]}
        sources={sources}
        preselectedSource={preselected}
        prefill={safePrefill}
        riskHandoff={sourceRisk ? { reference: sourceRisk.reference, residualScore: sourceRisk.residualScore, targetScore: sourceRisk.targetScore ?? sourceRisk.residualScore } : undefined}
        incidentHandoff={sourceIncident ? { reference: sourceIncident.reference, riskLevel: sourceIncident.riskLevel } : undefined}
        complaintHandoff={sourceComplaint ? { reference: sourceComplaint.reference, riskLevel: sourceComplaint.riskLevel } : undefined}
      />
    </main>;
  } finally {
    await db.$disconnect();
  }
}

function auditScope(context: { organisation: { id: string }; allLocations: boolean; locations: { id: string }[] }) {
  return { organisationId: context.organisation.id, ...(context.allLocations ? {} : { locationId: { in: context.locations.map(({ id }) => id) } }) };
}
