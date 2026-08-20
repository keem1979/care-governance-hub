import "server-only";

import type { AuthorisedContext } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { calculateInspectionAssurance } from "@/lib/inspection-assurance";
import { ensureInspectionBaseline } from "@/lib/inspection-baseline";
import { inspectionScopeWhere } from "@/lib/inspection";
import { evidenceCategoriesFor, evidenceRequirementKeys } from "@/lib/inspection-sync";
import { registerScopeWhere } from "@/lib/registers";
import { evidenceAssuranceState, mappingSupportsClaim } from "@/lib/evidence-assurance";

export type InspectionRecordLink = { id: string; label: string; href: string; type: string; status: string; date: Date | null };
export type InspectionRequirementView = Awaited<ReturnType<typeof getInspectionRequirements>>[number];

export async function getInspectionRequirements(context: AuthorisedContext) {
  const db = createDb();
  try {
    await ensureInspectionBaseline(db, context.organisation.id, context.user.id);
    const scope = inspectionScopeWhere(context), evidenceScope = evidenceScopeWhere(context), now = new Date();
    const [requirements, automaticEvidence, policies, risks, kpis, meetings, workforce] = await Promise.all([
      db.complianceRequirement.findMany({
        where: scope,
        include: {
          owner: { select: { id: true, name: true } }, location: { select: { id: true, name: true } }, reviewedBy: { select: { name: true } }, signedOffBy: { select: { name: true } },
          evidenceLinks: { include: { evidence: { select: { id: true, title: true, category: true, status: true, reviewExpiryDate: true, relatedModule: true, relatedRecordId: true, tags: true, updatedAt: true, currentVersionId: true, verifications: { orderBy: { verifiedAt: "desc" }, take: 1 } } } } },
          auditLinks: { include: { audit: { select: { id: true, title: true, status: true, reviewDate: true, findings: { where: { resolvedAt: null }, select: { id: true } } } } } },
          registerLinks: { include: { registerEntry: { select: { id: true, reference: true, title: true, status: true, eventDate: true, definition: { select: { key: true } } } } } },
          actionLinks: { include: { action: { select: { id: true, reference: true, title: true, status: true, dueDate: true } } } },
        },
        orderBy: [{ keyQuestion: "asc" }, { title: "asc" }],
      }),
      db.evidence.findMany({ where: evidenceScope, select: { id: true, title: true, category: true, status: true, reviewExpiryDate: true, relatedModule: true, relatedRecordId: true, tags: true, evidenceDate: true }, orderBy: { updatedAt: "desc" }, take: 3000 }),
      db.policy.findMany({ where: { organisationId: context.organisation.id, archivedAt: null }, select: { id: true, title: true, status: true, approvalStatus: true, nextReviewDate: true } }),
      db.risk.findMany({ where: { organisationId: context.organisation.id, archivedAt: null, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((x) => x.id) } }] }) }, select: { id: true, reference: true, title: true, status: true, residualLevel: true, nextReviewDate: true } }),
      db.kpiEntry.findMany({ where: { organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((x) => x.id) } }] }) }, select: { id: true, reportingMonth: true, ragStatus: true, kpi: { select: { name: true } } }, orderBy: { reportingMonth: "desc" }, take: 500 }),
      db.governanceMeeting.findMany({ where: { organisationId: context.organisation.id, status: { not: "ARCHIVED" }, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((x) => x.id) } }] }) }, select: { id: true, reference: true, title: true, status: true, meetingDate: true }, orderBy: { meetingDate: "desc" }, take: 200 }),
      db.staffComplianceRecord.findMany({ where: { organisationId: context.organisation.id, staffMember: { archivedAt: null, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((x) => x.id) } }] }) } }, select: { id: true, type: true, outcome: true, expiryDate: true, nextDueDate: true }, take: 3000 }),
    ]);

    const autoByKey = new Map<string, typeof automaticEvidence>();
    for (const evidence of automaticEvidence) for (const key of evidenceRequirementKeys(evidence)) autoByKey.set(key, [...(autoByKey.get(key) ?? []), evidence]);

    return requirements.map((item) => {
      const automatic = item.catalogueKey ? autoByKey.get(item.catalogueKey) ?? [] : [];
      const mappedDocuments = item.evidenceLinks.map((link) => { const state=evidenceAssuranceState({status:link.evidence.status,reviewExpiryDate:link.evidence.reviewExpiryDate,updatedAt:link.evidence.updatedAt,currentVersionId:link.evidence.currentVersionId,verification:link.evidence.verifications[0]},now); return {link,state,support:mappingSupportsClaim(link.decision,state)}; });
      const documents = uniqueById([...item.evidenceLinks.map((x) => x.evidence), ...automatic]);
      const currentDocuments = mappedDocuments.filter((x) => x.support === "FULL").map((x)=>x.link.evidence);
      const expiredDocuments = mappedDocuments.filter((x) => ["EXPIRED","ARCHIVED"].includes(x.state)).map((x)=>x.link.evidence);
      const unsupportedEvidence = mappedDocuments.filter((x) => x.support === "NONE" && !["EXPIRED","ARCHIVED"].includes(x.state)).length;
      const audits = item.auditLinks.map((x) => x.audit), registers = item.registerLinks.map((x) => x.registerEntry), actions = item.actionLinks.map((x) => x.action);
      const openActions = actions.filter((x) => !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(x.status));
      const overdueActions = openActions.filter((x) => x.dueDate < now);
      const live = liveModuleSignals(item.catalogueKey, { policies, risks, kpis, meetings, workforce }, now);
      const inferredCategories = mappedDocuments.filter((x)=>x.support==="FULL").flatMap((x)=>x.link.evidenceCategories.length?x.link.evidenceCategories:evidenceCategoriesFor(x.link.evidence));
      if (audits.length) inferredCategories.push("OBSERVATION", "PROCESSES");
      if (registers.length) inferredCategories.push("PEOPLES_EXPERIENCE", "PROCESSES");
      if (actions.length) inferredCategories.push("OUTCOMES");
      const coveredCategories = [...new Set([...item.coveredEvidenceCategories, ...inferredCategories, ...live.categories])];
      const assurance = calculateInspectionAssurance({
        reviewDate: item.reviewDate,
        expectedCategories: item.expectedEvidenceCategories,
        coveredCategories,
        currentEvidence: currentDocuments.length,
        expiredEvidence: expiredDocuments.length,
        unsupportedEvidence,
        activeAudits: audits.filter((x) => ["AWAITING_REVIEW", "COMPLETED", "CLOSED"].includes(x.status)).length,
        unresolvedFindings: audits.reduce((sum, x) => sum + x.findings.length, 0),
        activeRegisters: registers.filter((x) => x.status !== "ARCHIVED").length,
        openActions: openActions.length,
        overdueActions: overdueActions.length,
        liveSignals: live.count,
        adverseSignals: live.adverse,
        managementDecision: item.managementDecision,
        reviewedAt: item.reviewedAt,
        signedOffAt: item.signedOffAt,
        now,
      });
      const connectedRecords: InspectionRecordLink[] = [
        ...mappedDocuments.map(({link,state}) => ({ id: link.evidence.id, label: link.evidence.title, href: `/evidence/${link.evidence.id}`, type: link.evidence.relatedModule ?? "Evidence", status: `${link.decision} · ${state}`, date: link.evidence.reviewExpiryDate })),
        ...automatic.filter((candidate)=>!item.evidenceLinks.some((link)=>link.evidenceId===candidate.id)).map((x)=>({id:x.id,label:x.title,href:`/evidence/${x.id}`,type:x.relatedModule??"Evidence suggestion",status:"UNMAPPED",date:x.reviewExpiryDate})),
        ...audits.map((x) => ({ id: x.id, label: x.title, href: `/audits/${x.id}`, type: "Audit", status: x.status, date: x.reviewDate })),
        ...registers.map((x) => ({ id: x.id, label: `${x.reference} - ${x.title}`, href: `/registers/${x.definition.key}/${x.id}`, type: "Register", status: x.status, date: x.eventDate })),
        ...actions.map((x) => ({ id: x.id, label: `${x.reference} - ${x.title}`, href: `/actions/${x.id}`, type: "Action", status: x.status, date: x.dueDate })),
        ...live.links,
      ];
      return { ...item, documents, audits, registers, actions, coveredCategories, assurance, connectedRecords };
    });
  } finally { await db.$disconnect(); }
}

export async function getInspectionFormOptions(context: AuthorisedContext) {
  const db = createDb();
  try {
    await ensureInspectionBaseline(db, context.organisation.id, context.user.id);
    const [memberships, evidence, audits, registers, actions] = await Promise.all([
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 1000 }),
      db.audit.findMany({ where: { ...auditScopeWhere(context), status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { auditDate: "desc" }, take: 1000 }),
      db.registerEntry.findMany({ where: { ...registerScopeWhere(context), status: { not: "ARCHIVED" } }, select: { id: true, reference: true, title: true }, orderBy: { eventDate: "desc" }, take: 1000 }),
      db.action.findMany({ where: { ...actionScopeWhere(context), status: { not: "ARCHIVED" } }, select: { id: true, reference: true, title: true }, orderBy: { dueDate: "desc" }, take: 1000 }),
    ]);
    return { members: memberships.map(({ user }) => user), locations: context.locations.map(({ id, name }) => ({ id, name })), evidence: evidence.map(({ id, title }) => ({ id, name: title })), audits: audits.map(({ id, title }) => ({ id, name: title })), registers: registers.map(({ id, reference, title }) => ({ id, name: `${reference} - ${title}` })), actions: actions.map(({ id, reference, title }) => ({ id, name: `${reference} - ${title}` })) };
  } finally { await db.$disconnect(); }
}

function uniqueById<T extends { id: string }>(items: T[]) { return [...new Map(items.map((item) => [item.id, item])).values()]; }

function liveModuleSignals(key: string | null, data: { policies: Array<{id:string;title:string;status:string;approvalStatus:string;nextReviewDate:Date|null}>;risks:Array<{id:string;reference:string;title:string;status:string;residualLevel:string;nextReviewDate:Date}>;kpis:Array<{id:string;reportingMonth:Date;ragStatus:string;kpi:{name:string}}> ;meetings:Array<{id:string;reference:string;title:string;status:string;meetingDate:Date}>;workforce:Array<{id:string;type:string;outcome:string;expiryDate:Date|null;nextDueDate:Date|null}> }, now: Date) {
  const links: InspectionRecordLink[] = [], categories = new Set<string>(); let count = 0, adverse = 0;
  if (key === "well-policy-control") { count += data.policies.length; adverse += data.policies.filter((x) => x.approvalStatus !== "APPROVED" || Boolean(x.nextReviewDate && x.nextReviewDate < now)).length; categories.add("PROCESSES"); links.push({id:"policies",label:`Policy Library · ${data.policies.length} live policies`,href:"/policies",type:"Policy",status:adverse?"ATTENTION":"CURRENT",date:null}); }
  if (key === "well-risk-register") { count += data.risks.length; adverse += data.risks.filter((x) => ["HIGH","CRITICAL"].includes(x.residualLevel) || x.nextReviewDate < now).length; categories.add("PROCESSES"); categories.add("OUTCOMES"); links.push({id:"risks",label:`Risk Register · ${data.risks.length} live risks`,href:"/risks",type:"Risk",status:adverse?"ATTENTION":"CURRENT",date:null}); }
  if (key === "well-kpis") { count += data.kpis.length; adverse += data.kpis.filter((x) => x.ragStatus === "RED").length; categories.add("OUTCOMES"); links.push({id:"kpis",label:`KPI Suite · ${data.kpis.length} recorded results`,href:"/kpis",type:"KPI",status:adverse?"ATTENTION":"CURRENT",date:data.kpis[0]?.reportingMonth??null}); }
  if (key === "well-governance-minutes") { count += data.meetings.length; adverse += data.meetings.filter((x) => !["APPROVED","CANCELLED"].includes(x.status) && x.meetingDate < now).length; categories.add("STAFF_AND_LEADER_FEEDBACK"); categories.add("PROCESSES"); links.push({id:"meetings",label:`Governance Meetings · ${data.meetings.length} records`,href:"/meetings",type:"Meeting",status:adverse?"ATTENTION":"CURRENT",date:data.meetings[0]?.meetingDate??null}); }
  if (["effective-training-matrix","effective-competency-matrix","effective-supervision","effective-appraisals","effective-spot-checks","effective-professional-registration"].includes(key ?? "")) { const type = key?.includes("training")?"TRAINING":key?.includes("competency")?"COMPETENCY":key?.includes("supervision")?"SUPERVISION":key?.includes("appraisal")?"APPRAISAL":key?.includes("spot-check")?"SPOT_CHECK":"REGISTRATION"; const rows=data.workforce.filter((x)=>x.type===type); count+=rows.length; adverse+=rows.filter((x)=>!["VALID","COMPETENT","COMPLETED"].includes(x.outcome)||Boolean((x.expiryDate??x.nextDueDate)&&((x.expiryDate??x.nextDueDate) as Date)<now)).length; categories.add("STAFF_AND_LEADER_FEEDBACK"); categories.add("OUTCOMES"); links.push({id:`workforce-${type}`,label:`Workforce Compliance · ${rows.length} ${type.toLowerCase()} records`,href:"/workforce",type:"Workforce",status:adverse?"ATTENTION":"CURRENT",date:null}); }
  return { count, adverse, categories: [...categories], links };
}
