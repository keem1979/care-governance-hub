import "server-only";

import type { AuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { getInspectionRequirements } from "@/lib/inspection-data";
import { DEFAULT_CONFIGURATION, parseConfigurationSettings } from "@/lib/configurable-delivery";

export type RecentDashboardActivity = {
  id: string;
  action: string;
  summary: string;
  createdAt: string;
  userName: string | null;
};

export type DashboardCounts = {
  policiesDue: number;
  overdueAudits: number;
  trainingEvidenceExpiring: number;
  documentsExpiring: number;
  openComplaints: number;
  openSafeguarding: number;
  incidentsAwaitingReview: number;
  risksOverdueReview: number;
  openHighRiskActions: number;
  overdueActions: number;
  governanceMeetingsDue: number;
  workforceChecksDue: number;
  competencyActions: number;
  kpiReturnsOutstanding: number;
  inspectionAttention: number;
};

export async function getDashboardCounts(context: AuthorisedContext): Promise<DashboardCounts> {
  const db = createDb();
  const now = new Date();
  const locationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id }) => id) } }] };
  const auditLocationScope = context.allLocations ? {} : { locationId: { in: context.locations.map(({ id }) => id) } };
  try {
    const publishedConfiguration = await db.tenantConfigurationVersion.findFirst({ where: { organisationId: context.organisation.id, status: "PUBLISHED" }, orderBy: { versionNumber: "desc" }, select: { settings: true } });
    const configuration = publishedConfiguration ? parseConfigurationSettings(publishedConfiguration.settings) : DEFAULT_CONFIGURATION;
    const reviewHorizon = new Date(now); reviewHorizon.setDate(reviewHorizon.getDate() + configuration.reviewLeadDays);
    const evidenceHorizon = new Date(now); evidenceHorizon.setDate(evidenceHorizon.getDate() + configuration.evidenceExpiryLeadDays);
    const staffLocationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id }) => id) } }] };
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12));
    const [policiesDue, overdueAudits, trainingEvidenceExpiring, documentsExpiring, openComplaints, openSafeguarding, incidentsAwaitingReview, risksOverdueReview, openHighRiskActions, overdueActions, governanceMeetingsDue, workforceChecksDue, competencyActions, submittedKpiLocations] = await Promise.all([
      db.policy.count({ where: { organisationId: context.organisation.id, status: "APPROVED", nextReviewDate: { lte: reviewHorizon } } }),
      db.audit.count({ where: { organisationId: context.organisation.id, status: { in: ["DRAFT","IN_PROGRESS","AWAITING_REVIEW"] }, reviewDate: { lt: now }, ...auditLocationScope } }),
      db.evidence.count({ where: { organisationId: context.organisation.id, status: "ACTIVE", category: { in: ["Training", "Competencies"] }, reviewExpiryDate: { gte: now, lte: evidenceHorizon }, ...locationScope } }),
      db.evidence.count({ where: { organisationId: context.organisation.id, status: "ACTIVE", reviewExpiryDate: { gte: now, lte: evidenceHorizon }, ...locationScope } }),
      db.registerEntry.count({ where: { organisationId: context.organisation.id, definition: { key: "complaints" }, status: { notIn: ["CLOSED","ARCHIVED"] }, ...locationScope } }),
      db.registerEntry.count({ where: { organisationId: context.organisation.id, definition: { key: "safeguarding" }, status: { notIn: ["CLOSED","ARCHIVED"] }, ...locationScope } }),
      db.registerEntry.count({ where: { organisationId: context.organisation.id, definition: { key: "incidents" }, status: { in: ["OPEN","IN_REVIEW","AWAITING_ACTION"] }, ...locationScope } }),
      db.risk.count({ where: { organisationId: context.organisation.id, status: { notIn: ["CLOSED","ARCHIVED"] }, nextReviewDate: { lt: now }, ...locationScope } }),
      db.action.count({ where: { organisationId: context.organisation.id, status: { notIn: ["COMPLETED","CANCELLED","ARCHIVED"] }, priority: { in: ["HIGH","CRITICAL"] }, ...locationScope } }),
      db.action.count({ where: { organisationId: context.organisation.id, status: { notIn: ["COMPLETED","CANCELLED","ARCHIVED"] }, dueDate: { lt: now }, ...locationScope } }),
      db.governanceMeeting.count({ where: { organisationId: context.organisation.id, status: { in: ["SCHEDULED","IN_PROGRESS"] }, meetingDate: { lte: reviewHorizon }, ...locationScope } }),
      db.staffComplianceRecord.count({ where: { organisationId: context.organisation.id, OR: [{ expiryDate: { lte: reviewHorizon } }, { nextDueDate: { lte: reviewHorizon } }], staffMember: { archivedAt: null, ...staffLocationScope } } }),
      db.staffComplianceRecord.count({ where: { organisationId: context.organisation.id, type: "COMPETENCY", outcome: { in: ["PENDING","DEVELOPMENT_REQUIRED"] }, staffMember: { archivedAt: null, ...staffLocationScope } } }),
      db.kpiReturn.count({ where: { organisationId: context.organisation.id, reportingMonth: monthStart, status: { in: ["READY_FOR_REVIEW", "SUBMITTED", "LOCKED"] }, ...(context.allLocations ? {} : { locationId: { in: context.locations.map(({ id }) => id) } }) } }),
    ]);
    const inspection = await getInspectionRequirements(context);
    return { policiesDue, overdueAudits, trainingEvidenceExpiring, documentsExpiring, openComplaints, openSafeguarding, incidentsAwaitingReview, risksOverdueReview, openHighRiskActions, overdueActions, governanceMeetingsDue, workforceChecksDue, competencyActions, kpiReturnsOutstanding: Math.max(0, context.locations.length - submittedKpiLocations), inspectionAttention: inspection.filter((item) => !["ASSURED", "NOT_APPLICABLE"].includes(item.assurance.status)).length };
  } finally { await db.$disconnect(); }
}

export async function getRecentDashboardActivity(
  context: AuthorisedContext,
): Promise<RecentDashboardActivity[]> {
  const db = createDb();
  const permittedLocationIds = context.locations.map(({ id }) => id);

  try {
    const activity = await db.activityLog.findMany({
      where: {
        organisationId: context.organisation.id,
        ...(context.allLocations
          ? {}
          : {
              OR: [
                { locationId: null },
                { locationId: { in: permittedLocationIds } },
              ],
            }),
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        action: true,
        summary: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    return activity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
      userName: entry.user?.name ?? null,
    }));
  } finally {
    await db.$disconnect();
  }
}
