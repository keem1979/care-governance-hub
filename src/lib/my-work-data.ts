import "server-only";

import type { AuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { extractWorkTarget, type MyWorkItem, type MyWorkPriority } from "@/lib/my-work";

const CLOSED_ACTION_LIFECYCLES = ["CLOSED_VERIFIED", "NO_ACTION_REQUIRED", "SUSTAINED_IMPROVEMENT"] as const;

export async function getMyWorkData(context: AuthorisedContext) {
  const db = createDb();
  const now = new Date();
  const authorisedLocationIds = context.locations.map(({ id }) => id);
  const locationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: authorisedLocationIds } }] };
  const strictLocationScope = context.allLocations ? {} : { locationId: { in: authorisedLocationIds } };

  try {
    const [actions, risks, audits, policies, evidence, meetings, decisions, obligations, dependencies, inspection, calendar, registers, escalations] = await Promise.all([
      db.action.findMany({
        where: { organisationId: context.organisation.id, ownerId: context.user.id, archivedAt: null, status: { notIn: ["CANCELLED", "ARCHIVED"] }, lifecycleStatus: { notIn: [...CLOSED_ACTION_LIFECYCLES] }, ...locationScope },
        select: { id: true, reference: true, title: true, description: true, dueDate: true, priority: true, status: true, lifecycleStatus: true, location: { select: { name: true } }, client: { select: { firstName: true, lastName: true, preferredName: true } } },
      }),
      db.risk.findMany({
        where: { organisationId: context.organisation.id, ownerId: context.user.id, archivedAt: null, status: { notIn: ["CLOSED", "ARCHIVED"] }, ...locationScope },
        select: { id: true, reference: true, title: true, description: true, nextReviewDate: true, residualLevel: true, status: true, location: { select: { name: true } } },
      }),
      db.audit.findMany({
        where: { organisationId: context.organisation.id, auditorId: context.user.id, archivedAt: null, status: { notIn: ["COMPLETED", "CLOSED", "ARCHIVED"] }, ...strictLocationScope },
        select: { id: true, title: true, objective: true, auditDate: true, reviewDate: true, status: true, location: { select: { name: true } } },
      }),
      db.policy.findMany({
        where: { organisationId: context.organisation.id, ownerId: context.user.id, archivedAt: null, status: { not: "ARCHIVED" } },
        select: { id: true, title: true, category: true, nextReviewDate: true, status: true, approvalStatus: true },
      }),
      db.evidence.findMany({
        where: { organisationId: context.organisation.id, ownerId: context.user.id, status: "ACTIVE", archivedAt: null, reviewExpiryDate: { not: null }, ...locationScope },
        select: { id: true, title: true, category: true, reviewExpiryDate: true, location: { select: { name: true } } },
      }),
      db.governanceMeeting.findMany({
        where: { organisationId: context.organisation.id, chairId: context.user.id, archivedAt: null, status: { notIn: ["APPROVED", "CANCELLED", "ARCHIVED"] }, ...locationScope },
        select: { id: true, reference: true, title: true, meetingType: true, meetingDate: true, status: true, location: { select: { name: true } } },
      }),
      db.governanceDecision.findMany({
        where: { organisationId: context.organisation.id, ownerId: context.user.id, status: { notIn: ["REVIEWED", "SUPERSEDED", "WITHDRAWN"] }, ...locationScope },
        select: { id: true, decisionText: true, impact: true, status: true, reviewDueAt: true, location: { select: { name: true } } },
      }),
      db.governanceObligation.findMany({
        where: { organisationId: context.organisation.id, ownerId: context.user.id, status: { notIn: ["ACCEPTED", "CLOSED", "CANCELLED"] }, ...locationScope },
        select: { id: true, reference: true, title: true, obligationType: true, dueAt: true, status: true, location: { select: { name: true } } },
      }),
      db.externalDependency.findMany({
        where: { organisationId: context.organisation.id, ownerId: context.user.id, status: { notIn: ["RESOLVED", "CANCELLED"] }, ...locationScope },
        select: { id: true, partyName: true, request: true, dueDate: true, status: true, location: { select: { name: true } }, action: { select: { id: true, reference: true } } },
      }),
      db.complianceRequirement.findMany({
        where: { organisationId: context.organisation.id, ownerId: context.user.id, managementDecision: { notIn: ["ASSURED", "NOT_APPLICABLE"] }, ...locationScope },
        select: { id: true, title: true, keyQuestion: true, reviewDate: true, evidenceStatus: true, managementDecision: true, location: { select: { name: true } } },
      }),
      db.calendarItem.findMany({
        where: { organisationId: context.organisation.id, ownerId: context.user.id, archivedAt: null, status: "PENDING", ...locationScope },
        select: { id: true, title: true, description: true, itemType: true, dueDate: true, riskLevel: true, status: true, location: { select: { name: true } } },
      }),
      db.registerEntry.findMany({
        where: { organisationId: context.organisation.id, OR: [{ ownerId: context.user.id }, { complaintInvestigation: { is: { investigatorId: context.user.id } } }, { safeguardingCase: { is: { investigatorId: context.user.id } } }], archivedAt: null, status: { in: ["OPEN", "IN_REVIEW", "AWAITING_ACTION"] }, ...locationScope },
        select: { id: true, reference: true, title: true, summary: true, riskLevel: true, status: true, data: true, definition: { select: { key: true, name: true } }, location: { select: { name: true } }, client: { select: { firstName: true, lastName: true, preferredName: true } }, complaintInvestigation: { select: { acknowledgementDueAt: true, responseDueAt: true, extensionDueAt: true, status: true } }, complaintCommunications: { where: { type: { in: ["ACKNOWLEDGEMENT", "FINAL_RESPONSE"] } }, select: { type: true } }, complaintAssuranceReviews: { orderBy: { reviewedAt: "desc" }, take: 1, select: { decision: true } }, safeguardingCase: { select: { safetyPosition: true, referralDecision: true, status: true, externalResponseDueAt: true, externalResponseStatus: true } }, safeguardingAssuranceReviews: { orderBy: { reviewedAt: "desc" }, take: 1, select: { decision: true } } },
      }),
      db.assistantEscalation.findMany({
        where: { organisationId: context.organisation.id, assignedToId: context.user.id, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
        select: { id: true, reference: true, questionRedacted: true, priority: true, reasonCode: true, status: true },
      }),
    ]);

    const items: MyWorkItem[] = [
      ...actions.map((item) => work({ key: `ACTION:${item.id}`, source: "Action", reference: item.reference, title: actionWorkTitle(item.lifecycleStatus, item.title), detail: actionWorkDetail(item.lifecycleStatus, item.description), href: actionWorkHref(item.id, item.lifecycleStatus), targetAt: item.dueDate, priority: item.priority, state: item.lifecycleStatus, locationName: item.location?.name, clientName: personName(item.client) })),
      ...risks.map((item) => work({ key: `RISK:${item.id}`, source: "Risk review", reference: item.reference, title: item.title, detail: item.description, href: `/risks/${item.id}`, targetAt: item.nextReviewDate, priority: item.residualLevel, state: item.status, locationName: item.location?.name })),
      ...audits.map((item) => work({ key: `AUDIT:${item.id}`, source: "Audit", reference: "Assigned audit", title: item.title, detail: item.objective ?? "Complete the audit and record the evidence-based outcome.", href: `/audits/${item.id}`, targetAt: item.reviewDate ?? item.auditDate, priority: "MEDIUM", state: item.status, locationName: item.location.name })),
      ...policies.map((item) => work({ key: `POLICY:${item.id}`, source: "Policy review", reference: item.category, title: item.title, detail: `Policy status: ${label(item.status)}; approval: ${label(item.approvalStatus)}.`, href: `/policies/${item.id}`, targetAt: item.nextReviewDate, priority: "MEDIUM", state: item.status, locationName: "Organisation-wide" })),
      ...evidence.map((item) => work({ key: `EVIDENCE:${item.id}`, source: "Evidence review", reference: item.category, title: item.title, detail: "Review or replace this evidence before its control date.", href: `/evidence/${item.id}`, targetAt: item.reviewExpiryDate, priority: "MEDIUM", state: "REVIEW_DUE", locationName: item.location?.name })),
      ...meetings.map((item) => work({ key: `MEETING:${item.id}`, source: "Governance meeting", reference: item.reference, title: item.title, detail: `Chair the ${label(item.meetingType)} meeting and complete its controlled record.`, href: `/meetings/${item.id}`, targetAt: item.meetingDate, priority: "MEDIUM", state: item.status, locationName: item.location?.name })),
      ...decisions.map((item) => work({ key: `DECISION:${item.id}`, source: "Governance decision", reference: "Decision", title: item.decisionText, detail: "Implement or formally review the assigned governance decision.", href: "/governance-control", targetAt: item.reviewDueAt, priority: item.impact, state: item.status, locationName: item.location?.name })),
      ...obligations.map((item) => work({ key: `OBLIGATION:${item.id}`, source: "External obligation", reference: item.reference, title: item.title, detail: label(item.obligationType), href: "/governance-control", targetAt: item.dueAt, priority: "HIGH", state: item.status, locationName: item.location?.name })),
      ...dependencies.map((item) => work({ key: `DEPENDENCY:${item.id}`, source: "External follow-up", reference: item.action.reference, title: `Chase ${item.partyName}`, detail: item.request, href: `/actions/${item.action.id}/assurance`, targetAt: item.dueDate, priority: item.status === "OVERDUE" ? "HIGH" : "MEDIUM", state: item.status, locationName: item.location?.name })),
      ...inspection.map((item) => work({ key: `INSPECTION:${item.id}`, source: "Inspection assurance", reference: label(item.keyQuestion), title: item.title, detail: `Evidence: ${label(item.evidenceStatus)}; decision: ${label(item.managementDecision)}.`, href: `/inspection/${item.id}`, targetAt: item.reviewDate, priority: item.managementDecision === "NOT_ASSURED" ? "HIGH" : "MEDIUM", state: item.managementDecision, locationName: item.location?.name })),
      ...calendar.map((item) => work({ key: `CALENDAR:${item.id}`, source: "Scheduled task", reference: label(item.itemType), title: item.title, detail: item.description ?? "Complete the assigned scheduled task.", href: "/calendar", targetAt: item.dueDate, priority: priority(item.riskLevel), state: item.status, locationName: item.location?.name })),
      ...registers.map((item) => {
        const complaint = item.definition.key === "complaints", safeguarding = item.definition.key === "safeguarding";
        const acknowledgementRecorded = item.complaintCommunications.some(({ type }) => type === "ACKNOWLEDGEMENT");
        const responseRecorded = item.complaintCommunications.some(({ type }) => type === "FINAL_RESPONSE");
        const targetAt = complaint
          ? !acknowledgementRecorded
            ? item.complaintInvestigation?.acknowledgementDueAt ?? null
            : !responseRecorded
              ? item.complaintInvestigation?.extensionDueAt ?? item.complaintInvestigation?.responseDueAt ?? null
              : null
          : safeguarding ? item.safeguardingCase?.externalResponseDueAt ?? null : extractWorkTarget(item.data);
        const detail = complaint
          ? !acknowledgementRecorded
            ? "Acknowledge the Complaint and record the communication."
            : item.complaintInvestigation?.status !== "COMPLETED"
              ? "Complete the assigned Complaint investigation and findings."
              : !responseRecorded
                ? "Prepare, approve where required and issue the final response."
                : item.complaintAssuranceReviews[0]?.decision === "REOPENED"
                  ? "Review new information and complete the reopened Complaint phase."
                  : "Final response issued; complete Management Assurance when authorised."
          : safeguarding
            ? item.safeguardingAssuranceReviews[0]?.decision === "REOPENED"
              ? "Review material new information and complete the reopened safeguarding phase."
              : ["UNRESOLVED_IMMEDIATE_RISK","UNKNOWN_EVIDENCE_REQUIRED"].includes(item.safeguardingCase?.safetyPosition ?? "")
                ? "Confirm the person's current safety and record immediate protection."
                : item.safeguardingCase?.referralDecision === "AWAITING_DECISION" || item.safeguardingCase?.referralDecision === "REQUIRED"
                  ? "Complete the professional referral decision or record the required referral."
                  : item.safeguardingCase?.externalResponseDueAt && item.safeguardingCase.externalResponseDueAt < now && !item.safeguardingCase.externalResponseStatus
                    ? "External safeguarding response is overdue; follow up and record the outcome."
                  : item.safeguardingCase?.status !== "READY_FOR_ASSURANCE"
                    ? "Complete the proportionate safeguarding enquiry and outcome."
                    : "Safeguarding is awaiting an authorised Management Assurance decision."
            : item.summary;
        return work({ key: `REGISTER:${item.id}`, source: complaint ? "Complaint assurance" : safeguarding ? "Safeguarding assurance" : item.definition.name, reference: item.reference, title: item.title, detail, href: `/registers/${item.definition.key}/${item.id}`, targetAt, priority: item.riskLevel, state: item.status, locationName: item.location?.name, clientName: personName(item.client) });
      }),
      ...escalations.map((item) => work({ key: `ESCALATION:${item.id}`, source: "Management escalation", reference: item.reference, title: item.questionRedacted, detail: label(item.reasonCode), href: "/abi-assurance", targetAt: null, priority: item.priority === "IMMEDIATE" ? "CRITICAL" : item.priority === "HIGH" ? "HIGH" : "MEDIUM", state: item.status, locationName: "Organisation-wide" })),
    ];

    return { items };
  } finally {
    await db.$disconnect();
  }
}

function work(input: Omit<MyWorkItem, "locationName" | "priority"> & { locationName?: string | null; priority?: string | null }): MyWorkItem {
  return { ...input, priority: priority(input.priority), locationName: input.locationName ?? "Organisation-wide" };
}

function priority(value: string | null | undefined): MyWorkPriority {
  if (value === "CRITICAL" || value === "HIGH" || value === "LOW") return value;
  return "MEDIUM";
}

function personName(person: { firstName: string; lastName: string; preferredName: string | null } | null): string | undefined {
  if (!person) return undefined;
  return `${person.preferredName?.trim() || person.firstName} ${person.lastName}`;
}

function label(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function actionWorkTitle(lifecycle: string, title: string) {
  if (lifecycle === "AWAITING_VERIFICATION") return `Completion submitted: ${title}`;
  if (lifecycle === "AWAITING_EFFECTIVENESS") return `Effectiveness review: ${title}`;
  if (lifecycle === "READY_FOR_CLOSURE") return `Closure review: ${title}`;
  if (lifecycle === "REOPENED_REPEAT_FINDING") return `Reopened Action: ${title}`;
  return title;
}
function actionWorkDetail(lifecycle: string, fallback: string) {
  if (lifecycle === "AWAITING_VERIFICATION") return "Completion is recorded. A manager must compare the work and Evidence with the success measure.";
  if (lifecycle === "AWAITING_EFFECTIVENESS") return "Completion was verified. Review whether the expected outcome was actually achieved.";
  if (lifecycle === "READY_FOR_CLOSURE") return "Assurance requirements are recorded. An authorised closure decision remains outstanding.";
  if (lifecycle === "REOPENED_REPEAT_FINDING") return "A repeat finding has reopened this Action; review the control and renewed work required.";
  return fallback;
}
function actionWorkHref(id: string, lifecycle: string) {
  return ["AWAITING_VERIFICATION", "AWAITING_EFFECTIVENESS", "READY_FOR_CLOSURE", "REOPENED_REPEAT_FINDING"].includes(lifecycle) ? `/actions/${id}/assurance` : `/actions/${id}`;
}
