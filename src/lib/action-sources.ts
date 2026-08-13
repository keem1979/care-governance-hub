import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { isAssessmentKey } from "@/lib/assessments";

export type ActionSourceOption = { type: string; id: string; label: string };

type SourceContext = { organisation: { id: string }; allLocations: boolean; locations: { id: string }[] };
export type ResolvedActionSource = { reference: string | null; title: string; locationId: string | null; url: string | null; clientId: string | null; staffMemberId: string | null; occurredAt: Date };

export async function listActionSources(db: PrismaClient, context: SourceContext): Promise<ActionSourceOption[]> {
  const ids = context.locations.map(({ id }) => id);
  const scoped = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: ids } }] };
  const strict = context.allLocations ? {} : { locationId: { in: ids } };
  const [audits, registers, risks, policies, meetings, inspection, kpis, staff, evidence] = await Promise.all([
    db.audit.findMany({ where: { organisationId: context.organisation.id, ...strict }, select: { id: true, title: true }, orderBy: { auditDate: "desc" }, take: 100 }),
    db.registerEntry.findMany({ where: { organisationId: context.organisation.id, archivedAt: null, ...scoped }, select: { id: true, reference: true, title: true, definition: { select: { key: true, name: true } } }, orderBy: { eventDate: "desc" }, take: 200 }),
    db.risk.findMany({ where: { organisationId: context.organisation.id, archivedAt: null, ...scoped }, select: { id: true, reference: true, title: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    db.policy.findMany({ where: { organisationId: context.organisation.id, status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 100 }),
    db.governanceMeeting.findMany({ where: { organisationId: context.organisation.id, status: { not: "ARCHIVED" }, ...scoped }, select: { id: true, reference: true, title: true }, orderBy: { meetingDate: "desc" }, take: 100 }),
    db.complianceRequirement.findMany({ where: { organisationId: context.organisation.id, ...scoped }, select: { id: true, keyQuestion: true, title: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    db.kpiEntry.findMany({ where: { organisationId: context.organisation.id, ...scoped }, select: { id: true, reportingMonth: true, ragStatus: true, kpi: { select: { name: true } } }, orderBy: { reportingMonth: "desc" }, take: 100 }),
    db.staffMember.findMany({ where: { organisationId: context.organisation.id, archivedAt: null, ...scoped }, select: { id: true, employeeReference: true, firstName: true, lastName: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 150 }),
    db.evidence.findMany({ where: { organisationId: context.organisation.id, archivedAt: null, status: "ACTIVE", ...scoped }, select: { id: true, title: true, category: true }, orderBy: { updatedAt: "desc" }, take: 150 }),
  ]);
  return [
    ...audits.map((item) => ({ type: "AUDIT", id: item.id, label: item.title })),
    ...registers.map((item) => ({ type: isAssessmentKey(item.definition.key) ? "ASSESSMENT" : registerSourceType(item.definition.key), id: item.id, label: `${item.definition.name} · ${item.reference} — ${item.title}` })),
    ...risks.map((item) => ({ type: "RISK", id: item.id, label: `${item.reference} — ${item.title}` })),
    ...policies.map((item) => ({ type: "POLICY_REVIEW", id: item.id, label: item.title })),
    ...meetings.map((item) => ({ type: "GOVERNANCE_MEETING", id: item.id, label: `${item.reference} — ${item.title}` })),
    ...inspection.map((item) => ({ type: "INSPECTION", id: item.id, label: `${item.keyQuestion} · ${item.title}` })),
    ...kpis.map((item) => ({ type: "KPI", id: item.id, label: `${item.kpi.name} · ${month(item.reportingMonth)} · ${item.ragStatus}` })),
    ...staff.map((item) => ({ type: "WORKFORCE", id: item.id, label: `${item.employeeReference} · ${item.firstName} ${item.lastName}` })),
    ...evidence.map((item) => ({ type: "EVIDENCE", id: item.id, label: `${item.category} · ${item.title}` })),
  ];
}

export async function resolveActionSource(db: PrismaClient, context: SourceContext, type: string, id: string | null): Promise<ResolvedActionSource> {
  const organisationId=context.organisation.id, ids=context.locations.map(({id:locationId})=>locationId), scoped=context.allLocations?{}:{OR:[{locationId:null},{locationId:{in:ids}}]}, strict=context.allLocations?{}:{locationId:{in:ids}};
  if (type === "MANUAL") { if (id) throw new Error("Manual actions cannot have a source record."); return sourceMeta({ reference: null, title: "Manual entry", locationId: null, url: null }); }
  if (!id) throw new Error("Choose a source record.");
  if (type === "AUDIT") { const item = await db.audit.findFirst({ where: { id, organisationId,...strict }, select: { title: true, locationId: true, auditDate: true } }); if (item) return sourceMeta({ reference: item.title, title: item.title, locationId: item.locationId, url: `/audits/${id}`, occurredAt: item.auditDate }); }
  if (["COMPLAINT", "INCIDENT", "SAFEGUARDING", "REGISTER", "ASSESSMENT"].includes(type)) { const item = await db.registerEntry.findFirst({ where: { id, organisationId,...scoped }, select: { reference: true, title: true, locationId: true, clientId: true, staffMemberId: true, eventDate: true, definition: { select: { key: true } } } }); if (item) return sourceMeta({ reference: item.reference, title: item.title, locationId: item.locationId, clientId: item.clientId, staffMemberId: item.staffMemberId, occurredAt: item.eventDate, url: `/registers/${item.definition.key}/${id}` }); }
  if (type === "RISK") { const item = await db.risk.findFirst({ where: { id, organisationId,...scoped }, select: { reference: true, title: true, locationId: true } }); if (item) return sourceMeta({ reference: item.reference, title: item.title, locationId: item.locationId, url: `/risks/${id}` }); }
  if (type === "POLICY_REVIEW") { const item = await db.policy.findFirst({ where: { id, organisationId }, select: { title: true } }); if (item) return sourceMeta({ reference: item.title, title: item.title, locationId: null, url: `/policies/${id}` }); }
  if (type === "GOVERNANCE_MEETING") { const item = await db.governanceMeeting.findFirst({ where: { id, organisationId,...scoped }, select: { reference: true, title: true, locationId: true, meetingDate: true } }); if (item) return sourceMeta({ reference: item.reference, title: item.title, locationId: item.locationId, occurredAt: item.meetingDate, url: `/meetings/${id}` }); }
  if (type === "INSPECTION") { const item = await db.complianceRequirement.findFirst({ where: { id, organisationId,...scoped }, select: { title: true, keyQuestion: true, locationId: true } }); if (item) return sourceMeta({ reference: `${item.keyQuestion} · ${item.title}`, title: item.title, locationId: item.locationId, url: `/inspection/${id}` }); }
  if (type === "KPI") { const item = await db.kpiEntry.findFirst({ where: { id, organisationId,...scoped }, select: { reportingMonth: true, locationId: true, kpi: { select: { name: true } } } }); if (item) return sourceMeta({ reference: `${item.kpi.name} · ${month(item.reportingMonth)}`, title: item.kpi.name, locationId: item.locationId, occurredAt: item.reportingMonth, url: `/kpis?month=${item.reportingMonth.toISOString().slice(0, 7)}` }); }
  if (type === "WORKFORCE") { const item = await db.staffMember.findFirst({ where: { id, organisationId, archivedAt: null,...scoped }, select: { employeeReference: true, firstName: true, lastName: true, locationId: true } }); if (item) return sourceMeta({ reference: item.employeeReference, title: `${item.firstName} ${item.lastName}`, locationId: item.locationId, staffMemberId: id, url: `/workforce/${id}` }); }
  if (type === "EVIDENCE") { const item = await db.evidence.findFirst({ where: { id, organisationId, archivedAt: null,...scoped }, select: { title: true, locationId: true, evidenceDate: true } }); if (item) return sourceMeta({ reference: item.title, title: item.title, locationId: item.locationId, occurredAt: item.evidenceDate ?? new Date(), url: `/evidence/${id}` }); }
  throw new Error("The selected source record is not available in this organisation.");
}

function sourceMeta(value: Omit<ResolvedActionSource, "clientId" | "staffMemberId" | "occurredAt"> & Partial<Pick<ResolvedActionSource, "clientId" | "staffMemberId" | "occurredAt">>): ResolvedActionSource { return { clientId: null, staffMemberId: null, occurredAt: new Date(), ...value }; }

function registerSourceType(key: string) { return key === "complaints" ? "COMPLAINT" : key === "incidents" ? "INCIDENT" : key === "safeguarding" ? "SAFEGUARDING" : "REGISTER"; }
function month(value: Date) { return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "Europe/London" }).format(value); }
