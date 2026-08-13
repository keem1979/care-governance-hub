import "server-only";

import type { AuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { getInspectionRequirements } from "@/lib/inspection-data";
import {
  dateKey,
  filterReportRows,
  label,
  REPORT_DEFINITIONS,
  summariseReport,
  type ReportFilters,
  type ReportRow,
  type ReportType,
} from "@/lib/reports";

export type GeneratedReport = {
  rows: ReportRow[];
  statuses: string[];
  categories: string[];
  sourceCounts: { source: string; count: number }[];
  statusCounts: { status: string; count: number }[];
  summary: import("@/lib/reports").ReportSummary;
};

export async function generateReport(
  type: ReportType,
  context: AuthorisedContext,
  filters: ReportFilters,
): Promise<GeneratedReport> {
  const db = createDb();
  const permittedLocationIds = context.locations.map((item) => item.id);
  const optionalLocationScope = context.allLocations
    ? {}
    : { OR: [{ locationId: null }, { locationId: { in: permittedLocationIds } }] };
  const requiredLocationScope = context.allLocations
    ? {}
    : { locationId: { in: permittedLocationIds } };
  const selectedOptionalLocation = filters.locationId
    ? { locationId: filters.locationId }
    : optionalLocationScope;
  const selectedRequiredLocation = filters.locationId
    ? { locationId: filters.locationId }
    : requiredLocationScope;
  const now = new Date();

  try {
    const sources = REPORT_DEFINITIONS[type].sources as readonly string[];
    const rows: ReportRow[] = [];

    if (sources.includes("AUDIT")) {
      const audits = await db.audit.findMany({
        where: { organisationId: context.organisation.id, ...selectedRequiredLocation },
        include: {
          template: { select: { name: true } },
          location: { select: { name: true } },
          auditor: { select: { name: true } },
          _count: { select: { findings: true } },
        },
        orderBy: { auditDate: "desc" },
        take: 1000,
      });
      rows.push(...audits.map((item) => {
        const attention = (item.overallScore !== null && item.overallScore < 80) || item._count.findings > 0;
        return {
        type: "Audit",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.title,
        href: `/audits/${item.id}`,
        date: dateKey(item.auditDate),
        location: item.location.name,
        category: item.template.name,
        status: item.status,
        owner: item.auditor.name,
        detail: `${item.overallScore === null ? "Score not recorded" : `${item.overallScore}% score`}; ${item._count.findings} findings`,
        attention,
        overdue: false,
        attentionReason: attention ? "Score below 80% or findings recorded" : "",
      };}));
    }

    if (sources.includes("RISK")) {
      const risks = await db.risk.findMany({
        where: { organisationId: context.organisation.id, archivedAt: null, ...selectedOptionalLocation },
        include: { location: { select: { name: true } }, owner: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      rows.push(...risks.map((item) => {
        const overdue = item.nextReviewDate < now;
        const attention = item.residualScore >= 12 || overdue;
        return {
        type: "Risk",
        reference: item.reference,
        title: item.title,
        href: `/risks/${item.id}`,
        date: dateKey(item.createdAt),
        location: item.location?.name ?? "Organisation-wide",
        category: item.category,
        status: item.status,
        owner: item.owner?.name ?? "Unassigned",
        detail: `Residual score ${item.residualScore} (${label(item.residualLevel)}); next review ${dateKey(item.nextReviewDate)}`,
        attention,
        overdue,
        attentionReason: overdue ? "Risk review is overdue" : item.residualScore >= 12 ? "High residual risk score" : "",
      };}));
    }

    if (sources.includes("ACTION")) {
      const actions = await db.action.findMany({
        where: { organisationId: context.organisation.id, archivedAt: null, ...selectedOptionalLocation },
        include: {
          location: { select: { name: true } },
          owner: { select: { name: true } },
          _count: { select: { evidenceLinks: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      rows.push(...actions.map((item) => {
        const closed = ["CLOSED", "COMPLETED", "CANCELLED"].includes(item.status);
        const overdue = !closed && item.dueDate < now;
        const attention = overdue || ["HIGH", "URGENT", "CRITICAL"].includes(item.priority);
        return {
        type: "Action",
        reference: item.reference,
        title: item.title,
        href: `/actions/${item.id}`,
        date: dateKey(item.createdAt),
        location: item.location?.name ?? "Organisation-wide",
        category: label(item.sourceType),
        status: item.status,
        owner: item.owner.name,
        detail: `${label(item.priority)} priority; due ${dateKey(item.dueDate)}; ${item._count.evidenceLinks} evidence links`,
        attention,
        overdue,
        attentionReason: overdue ? "Action is overdue" : attention ? `${label(item.priority)} priority action` : "",
      };}));
    }

    if (sources.includes("KPI")) {
      const entries = await db.kpiEntry.findMany({
        where: { organisationId: context.organisation.id, ...selectedOptionalLocation },
        include: {
          kpi: { select: { name: true, unit: true } },
          location: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { reportingMonth: "desc" },
        take: 1000,
      });
      rows.push(...entries.map((item) => {
        const attention = item.ragStatus !== "GREEN";
        return {
        type: "KPI",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.kpi.name,
        href: `/kpis?month=${dateKey(item.reportingMonth).slice(0, 7)}`,
        date: dateKey(item.reportingMonth),
        location: item.location?.name ?? "Organisation-wide",
        category: "Performance",
        status: item.ragStatus,
        owner: item.createdBy.name,
        detail: `${item.actualValue} ${item.kpi.unit}; target ${item.targetValue}`,
        attention,
        overdue: false,
        attentionReason: attention ? `${label(item.ragStatus)} KPI result` : "",
      };}));
    }

    if (sources.some((source) => ["COMPLAINT", "INCIDENT", "SAFEGUARDING"].includes(source))) {
      const source = sources.find((item) => ["COMPLAINT", "INCIDENT", "SAFEGUARDING"].includes(item))!;
      const keyFragment = source === "COMPLAINT" ? "complaint" : source === "INCIDENT" ? "incident" : "safeguarding";
      const entries = await db.registerEntry.findMany({
        where: {
          organisationId: context.organisation.id,
          archivedAt: null,
          definition: { key: { contains: keyFragment, mode: "insensitive" } },
          ...selectedOptionalLocation,
        },
        include: {
          definition: { select: { key: true, name: true } },
          location: { select: { name: true } },
          owner: { select: { name: true } },
          _count: { select: { evidenceLinks: true } },
        },
        orderBy: { eventDate: "desc" },
        take: 1000,
      });
      rows.push(...entries.map((item) => {
        const attention = ["HIGH", "CRITICAL"].includes(item.riskLevel);
        return {
        type: label(source),
        reference: item.reference,
        title: item.title,
        href: `/registers/${item.definition.key}/${item.id}`,
        date: dateKey(item.eventDate),
        location: item.location?.name ?? "Organisation-wide",
        category: item.definition.name,
        status: item.status,
        owner: item.owner?.name ?? "Unassigned",
        detail: `${label(item.riskLevel)} risk; ${item._count.evidenceLinks} evidence links`,
        attention,
        overdue: false,
        attentionReason: attention ? `${label(item.riskLevel)} risk record` : "",
      };}));
    }

    if (sources.includes("POLICY")) {
      const policies = await db.policy.findMany({
        where: { organisationId: context.organisation.id, archivedAt: null },
        include: { owner: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      });
      rows.push(...policies.map((item) => {
        const overdue = Boolean(item.nextReviewDate && item.nextReviewDate < now);
        const attention = overdue || !["APPROVED", "PUBLISHED"].includes(item.approvalStatus);
        return {
        type: "Policy",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.title,
        href: `/policies/${item.id}`,
        date: dateKey(item.updatedAt),
        location: "Organisation-wide",
        category: item.category,
        status: item.status,
        owner: item.owner.name,
        detail: `${label(item.approvalStatus)}; next review ${item.nextReviewDate ? dateKey(item.nextReviewDate) : "not set"}`,
        attention,
        overdue,
        attentionReason: overdue ? "Policy review is overdue" : attention ? `Approval is ${label(item.approvalStatus)}` : "",
      };}));
    }

    if (sources.includes("INSPECTION")) {
      const requirements = (await getInspectionRequirements(context)).filter((item) => !filters.locationId || item.locationId === filters.locationId);
      rows.push(...requirements.map((item) => {
        const attention = item.assurance.score < 80 || item.assurance.blockers.length > 0;
        return {
        type: "Inspection requirement",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.title,
        href: `/inspection/${item.id}`,
        date: dateKey(item.updatedAt),
        location: item.location?.name ?? "Organisation-wide",
        category: label(item.keyQuestion),
        status: item.assurance.status,
        owner: item.owner?.name ?? "Unassigned",
        detail: `${item.assurance.score}% calculated assurance; ${item.connectedRecords.length} connected records; ${item.assurance.categoryCoverage}% evidence-category coverage; ${item.assurance.blockers.length ? item.assurance.blockers.join("; ") : "no blockers"}`,
        attention,
        overdue: false,
        attentionReason: attention ? item.assurance.blockers.join("; ") || "Calculated assurance below 80%" : "",
      };}));
    }

    if (sources.includes("EVIDENCE")) {
      const evidence = await db.evidence.findMany({
        where: { organisationId: context.organisation.id, archivedAt: null, ...selectedOptionalLocation },
        include: {
          location: { select: { name: true } },
          owner: { select: { name: true } },
          currentVersion: { select: { versionNumber: true, fileName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      rows.push(...evidence.map((item) => {
        const overdue = Boolean(item.reviewExpiryDate && item.reviewExpiryDate < now);
        const attention = overdue || !item.currentVersion;
        return {
        type: "Evidence",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.title,
        href: `/evidence/${item.id}`,
        date: dateKey(item.evidenceDate ?? item.createdAt),
        location: item.location?.name ?? "Organisation-wide",
        category: item.category,
        status: item.status,
        owner: item.owner.name,
        detail: `${item.evidenceType}; v${item.currentVersion?.versionNumber ?? "—"}; review ${item.reviewExpiryDate ? dateKey(item.reviewExpiryDate) : "not set"}`,
        attention,
        overdue,
        attentionReason: overdue ? "Evidence review is overdue" : !item.currentVersion ? "No current evidence version" : "",
      };}));
    }

    const filtered = filterReportRows(rows, filters).sort((a, b) => b.date.localeCompare(a.date));
    return {
      rows: filtered,
      statuses: [...new Set(rows.map((row) => row.status))].sort(),
      categories: [...new Set(rows.map((row) => row.category))].sort(),
      sourceCounts: [...new Set(rows.map((row) => row.type))].sort().map((source) => ({
        source,
        count: filtered.filter((row) => row.type === source).length,
      })),
      statusCounts: [...new Set(filtered.map((row) => row.status))].sort().map((status) => ({
        status,
        count: filtered.filter((row) => row.status === status).length,
      })),
      summary: summariseReport(filtered),
    };
  } finally {
    await db.$disconnect();
  }
}
