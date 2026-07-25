import "server-only";

import type { AuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import {
  dateKey,
  filterReportRows,
  label,
  REPORT_DEFINITIONS,
  type ReportFilters,
  type ReportRow,
  type ReportType,
} from "@/lib/reports";

export type GeneratedReport = {
  rows: ReportRow[];
  statuses: string[];
  categories: string[];
  sourceCounts: { source: string; count: number }[];
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
      rows.push(...audits.map((item) => ({
        type: "Audit",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.title,
        date: dateKey(item.auditDate),
        location: item.location.name,
        category: item.template.name,
        status: item.status,
        owner: item.auditor.name,
        detail: `${item.overallScore === null ? "Score not recorded" : `${item.overallScore}% score`}; ${item._count.findings} findings`,
      })));
    }

    if (sources.includes("RISK")) {
      const risks = await db.risk.findMany({
        where: { organisationId: context.organisation.id, archivedAt: null, ...selectedOptionalLocation },
        include: { location: { select: { name: true } }, owner: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      rows.push(...risks.map((item) => ({
        type: "Risk",
        reference: item.reference,
        title: item.title,
        date: dateKey(item.createdAt),
        location: item.location?.name ?? "Organisation-wide",
        category: item.category,
        status: item.status,
        owner: item.owner?.name ?? "Unassigned",
        detail: `Residual score ${item.residualScore} (${label(item.residualLevel)}); next review ${dateKey(item.nextReviewDate)}`,
      })));
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
      rows.push(...actions.map((item) => ({
        type: "Action",
        reference: item.reference,
        title: item.title,
        date: dateKey(item.createdAt),
        location: item.location?.name ?? "Organisation-wide",
        category: label(item.sourceType),
        status: item.status,
        owner: item.owner.name,
        detail: `${label(item.priority)} priority; due ${dateKey(item.dueDate)}; ${item._count.evidenceLinks} evidence links`,
      })));
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
      rows.push(...entries.map((item) => ({
        type: "KPI",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.kpi.name,
        date: dateKey(item.reportingMonth),
        location: item.location?.name ?? "Organisation-wide",
        category: "Performance",
        status: item.ragStatus,
        owner: item.createdBy.name,
        detail: `${item.actualValue} ${item.kpi.unit}; target ${item.targetValue}`,
      })));
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
          definition: { select: { name: true } },
          location: { select: { name: true } },
          owner: { select: { name: true } },
          _count: { select: { evidenceLinks: true } },
        },
        orderBy: { eventDate: "desc" },
        take: 1000,
      });
      rows.push(...entries.map((item) => ({
        type: label(source),
        reference: item.reference,
        title: item.title,
        date: dateKey(item.eventDate),
        location: item.location?.name ?? "Organisation-wide",
        category: item.definition.name,
        status: item.status,
        owner: item.owner?.name ?? "Unassigned",
        detail: `${label(item.riskLevel)} risk; ${item._count.evidenceLinks} evidence links`,
      })));
    }

    if (sources.includes("POLICY")) {
      const policies = await db.policy.findMany({
        where: { organisationId: context.organisation.id, archivedAt: null },
        include: { owner: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      });
      rows.push(...policies.map((item) => ({
        type: "Policy",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.title,
        date: dateKey(item.updatedAt),
        location: "Organisation-wide",
        category: item.category,
        status: item.status,
        owner: item.owner.name,
        detail: `${label(item.approvalStatus)}; next review ${item.nextReviewDate ? dateKey(item.nextReviewDate) : "not set"}`,
      })));
    }

    if (sources.includes("INSPECTION")) {
      const requirements = await db.complianceRequirement.findMany({
        where: { organisationId: context.organisation.id, ...selectedOptionalLocation },
        include: {
          location: { select: { name: true } },
          owner: { select: { name: true } },
          _count: { select: { evidenceLinks: true, auditLinks: true, registerLinks: true, actionLinks: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      });
      rows.push(...requirements.map((item) => ({
        type: "Inspection requirement",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.title,
        date: dateKey(item.updatedAt),
        location: item.location?.name ?? "Organisation-wide",
        category: label(item.keyQuestion),
        status: item.evidenceStatus,
        owner: item.owner?.name ?? "Unassigned",
        detail: `${item._count.evidenceLinks} evidence, ${item._count.auditLinks} audits, ${item._count.registerLinks} register entries, ${item._count.actionLinks} actions`,
      })));
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
      rows.push(...evidence.map((item) => ({
        type: "Evidence",
        reference: item.id.slice(0, 8).toUpperCase(),
        title: item.title,
        date: dateKey(item.evidenceDate ?? item.createdAt),
        location: item.location?.name ?? "Organisation-wide",
        category: item.category,
        status: item.status,
        owner: item.owner.name,
        detail: `${item.evidenceType}; v${item.currentVersion?.versionNumber ?? "—"}; review ${item.reviewExpiryDate ? dateKey(item.reviewExpiryDate) : "not set"}`,
      })));
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
    };
  } finally {
    await db.$disconnect();
  }
}
