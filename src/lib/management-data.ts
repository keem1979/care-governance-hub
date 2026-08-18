import "server-only";

import type { AuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { filterManagementQueue, type ManagementFilters, type ManagementQueueItem } from "@/lib/management-intelligence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const CLOSED_ASSURANCE = ["CLOSED_VERIFIED", "NO_ACTION_REQUIRED", "SUSTAINED_IMPROVEMENT"] as const;

export async function getManagementCommandData(context: AuthorisedContext, filters: ManagementFilters) {
  const db = createDb();
  const canViewGovernance = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW);
  const authorisedLocationIds = context.locations.map(({ id }) => id);
  const locationScope = context.allLocations
    ? {}
    : { OR: [{ locationId: null }, { locationId: { in: authorisedLocationIds } }] };
  const selectedLocation = filters.locationId ? { locationId: filters.locationId } : {};
  const myWork = filters.view === "MY_WORK" ? { ownerId: context.user.id } : {};

  try {
    const [actions, risks, dependencies, savedViews, delegations, members] = await Promise.all([
      db.action.findMany({
        where: {
          organisationId: context.organisation.id,
          archivedAt: null,
          status: { notIn: ["CANCELLED", "ARCHIVED"] },
          lifecycleStatus: { notIn: [...CLOSED_ASSURANCE] },
          ...locationScope,
          ...selectedLocation,
          ...myWork,
        },
        select: { id: true, reference: true, title: true, locationId: true, priority: true, status: true, lifecycleStatus: true, dueDate: true, owner: { select: { name: true } }, location: { select: { name: true } } },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        take: 250,
      }),
      canViewGovernance ? db.risk.findMany({
        where: {
          organisationId: context.organisation.id,
          archivedAt: null,
          status: { notIn: ["CLOSED", "ARCHIVED"] },
          ...locationScope,
          ...selectedLocation,
          ...myWork,
        },
        select: { id: true, reference: true, title: true, locationId: true, residualLevel: true, residualScore: true, toleranceScore: true, status: true, nextReviewDate: true, owner: { select: { name: true } }, location: { select: { name: true } } },
        orderBy: [{ residualScore: "desc" }, { nextReviewDate: "asc" }],
        take: 250,
      }) : Promise.resolve([]),
      db.externalDependency.findMany({
        where: {
          organisationId: context.organisation.id,
          status: { notIn: ["RESOLVED", "CANCELLED"] },
          ...locationScope,
          ...selectedLocation,
          ...myWork,
        },
        select: { id: true, partyName: true, request: true, locationId: true, status: true, dueDate: true, ownerId: true, action: { select: { id: true, reference: true, title: true, owner: { select: { name: true } }, location: { select: { name: true } } } } },
        orderBy: { dueDate: "asc" },
        take: 250,
      }),
      db.managementSavedView.findMany({
        where: { organisationId: context.organisation.id, userId: context.user.id },
        include: { location: { select: { name: true } } },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
      db.managementDelegation.findMany({
        where: {
          organisationId: context.organisation.id,
          OR: hasPermission(context.permissions, PERMISSIONS.MEMBERS_MANAGE)
            ? undefined
            : [{ delegatorId: context.membershipId }, { delegateId: context.membershipId }],
        },
        include: {
          location: { select: { name: true } },
          delegator: { select: { id: true, user: { select: { name: true } } } },
          delegate: { select: { id: true, user: { select: { name: true } } } },
        },
        orderBy: [{ status: "asc" }, { endsAt: "asc" }],
        take: 100,
      }),
      db.organisationMembership.findMany({
        where: { organisationId: context.organisation.id, status: "ACTIVE" },
        select: { id: true, allLocations: true, user: { select: { name: true } }, role: { select: { name: true } }, locations: { select: { locationId: true } } },
        orderBy: { user: { name: "asc" } },
      }),
    ]);

    const now = new Date();
    const queue: ManagementQueueItem[] = [
      ...actions.map((action): ManagementQueueItem => {
        const overdue = action.dueDate < now && !["COMPLETED"].includes(action.status);
        const unverified = ["AWAITING_EVIDENCE", "MANAGEMENT_RESPONSE_RECORDED", "AWAITING_VERIFICATION", "ACTION_REQUIRED", "ACTION_IN_PROGRESS", "REOPENED_REPEAT_FINDING"].includes(action.lifecycleStatus);
        return {
          key: `ACTION:${action.id}`,
          source: "ACTION",
          reference: action.reference,
          title: action.title,
          locationId: action.locationId,
          locationName: action.location?.name ?? "Organisation-wide",
          ownerName: action.owner.name,
          severity: action.priority === "CRITICAL" ? "CRITICAL" : action.priority === "HIGH" ? "HIGH" : "MEDIUM",
          state: action.lifecycleStatus,
          reason: overdue ? "The action is past its due date." : unverified ? "The next assurance decision is outstanding." : "The action remains open.",
          dueAt: action.dueDate,
          overdue,
          unverified,
          href: `/actions/${action.id}/assurance`,
        };
      }),
      ...risks.filter((risk) => risk.residualLevel === "CRITICAL" || risk.residualLevel === "HIGH" || risk.nextReviewDate < now || (risk.toleranceScore !== null && risk.residualScore > risk.toleranceScore)).map((risk): ManagementQueueItem => {
        const overdue = risk.nextReviewDate < now;
        const outsideTolerance = risk.toleranceScore !== null && risk.residualScore > risk.toleranceScore;
        return {
          key: `RISK:${risk.id}`,
          source: "RISK",
          reference: risk.reference,
          title: risk.title,
          locationId: risk.locationId,
          locationName: risk.location?.name ?? "Organisation-wide",
          ownerName: risk.owner?.name ?? "Unassigned",
          severity: risk.residualLevel === "CRITICAL" ? "CRITICAL" : risk.residualLevel === "HIGH" ? "HIGH" : "MEDIUM",
          state: risk.status,
          reason: overdue ? "The risk review is overdue." : outsideTolerance ? "Residual risk is above the recorded tolerance." : "High residual risk needs oversight.",
          dueAt: risk.nextReviewDate,
          overdue,
          unverified: false,
          href: `/risks/${risk.id}`,
        };
      }),
      ...dependencies.map((dependency): ManagementQueueItem => {
        const overdue = dependency.dueDate < now || dependency.status === "OVERDUE";
        return {
          key: `EXTERNAL:${dependency.id}`,
          source: "EXTERNAL",
          reference: dependency.action.reference,
          title: `${dependency.partyName}: ${dependency.request}`,
          locationId: dependency.locationId,
          locationName: dependency.action.location?.name ?? "Organisation-wide",
          ownerName: dependency.action.owner.name,
          severity: overdue ? "HIGH" : "MEDIUM",
          state: dependency.status,
          reason: overdue ? "An external response is overdue; check the interim control and escalation." : "Delivery depends on an external response.",
          dueAt: dependency.dueDate,
          overdue,
          unverified: false,
          href: `/actions/${dependency.action.id}/assurance`,
        };
      }),
    ];

    const filteredQueue = filterManagementQueue(queue, filters).sort(compareQueue);
    const locationSummaries = context.locations.map((location) => {
      const locationItems = queue.filter((item) => item.locationId === location.id);
      return { id: location.id, name: location.name, total: locationItems.length, critical: locationItems.filter((item) => item.severity === "CRITICAL").length, overdue: locationItems.filter((item) => item.overdue).length, unverified: locationItems.filter((item) => item.unverified).length };
    });

    return {
      queue: filteredQueue,
      totals: { all: queue.length, critical: queue.filter((item) => item.severity === "CRITICAL").length, overdue: queue.filter((item) => item.overdue).length, unverified: queue.filter((item) => item.unverified).length, external: queue.filter((item) => item.source === "EXTERNAL").length },
      locationSummaries,
      savedViews,
      delegations: delegations.map((item) => ({ ...item, effectiveStatus: item.status === "REVOKED" ? "REVOKED" : item.endsAt < now ? "EXPIRED" : item.startsAt > now ? "SCHEDULED" : "ACTIVE" })),
      members: members.filter((member) => member.id !== context.membershipId && (context.allLocations || member.allLocations || member.locations.some(({ locationId }) => authorisedLocationIds.includes(locationId)))),
    };
  } finally {
    await db.$disconnect();
  }
}

export async function getDefaultManagementFilters(context: AuthorisedContext): Promise<{ view: string; focus: string; location?: string } | null> {
  const db = createDb();
  try {
    const view = await db.managementSavedView.findFirst({
      where: { organisationId: context.organisation.id, userId: context.user.id, isDefault: true },
      select: { commandView: true, focus: true, locationId: true },
    });
    return view ? { view: view.commandView, focus: view.focus, ...(view.locationId ? { location: view.locationId } : {}) } : null;
  } finally {
    await db.$disconnect();
  }
}

function compareQueue(a: ManagementQueueItem, b: ManagementQueueItem): number {
  const severity = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  return Number(b.overdue) - Number(a.overdue) || severity[a.severity] - severity[b.severity] || (a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
}
