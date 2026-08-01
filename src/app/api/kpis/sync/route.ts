import { NextResponse } from "next/server";
import { ActionStatus, KpiRagStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { calculateKpiRag, parseKpiMonth } from "@/lib/kpis";
import {
  COMMISSIONER_KPI_SLUGS,
  commissionerKpiValues,
} from "@/lib/commissioner-kpis";
import type { KpiReturnData } from "@/lib/kpi-suite";
import {
  AUTO_SYNC_NOTE_PREFIX,
  compliancePercentage,
  isCurrentComplianceRecord,
  KPI_AUTO_SOURCES,
  kpiAutoSource,
  REGISTER_KPI_KEYS,
  WORKFORCE_KPI_TYPES,
} from "@/lib/kpi-sync";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const reportingMonth = parseKpiMonth(form.get("month"));
  const locationId = String(form.get("locationId") ?? "") || null;
  if (locationId && !context.locations.some((location) => location.id === locationId)) {
    return NextResponse.json({ error: "Choose an authorised location." }, { status: 400 });
  }
  const monthEnd = new Date(reportingMonth);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const asOf = monthEnd < new Date() ? monthEnd : new Date();
  const db = createDb();
  try {
    const definitions = await db.kpiDefinition.findMany({
      where: {
        organisationId: context.organisation.id,
        slug: { in: [...Object.keys(KPI_AUTO_SOURCES), ...COMMISSIONER_KPI_SLUGS] },
        isActive: true,
      },
    });
    const sourceValues = new Map<string, number>();
    if (locationId) {
      const monthlyReturn = await db.kpiReturn.findFirst({
        where: { organisationId: context.organisation.id, locationId, reportingMonth },
        select: { data: true },
      });
      if (monthlyReturn) {
        for (const [slug, value] of commissionerKpiValues(monthlyReturn.data as KpiReturnData)) {
          sourceValues.set(slug, value);
        }
      }
    }
    for (const [slug, registerKey] of Object.entries(REGISTER_KPI_KEYS)) {
      const value = await db.registerEntry.count({
        where: {
          organisationId: context.organisation.id,
          archivedAt: null,
          eventDate: { gte: reportingMonth, lt: monthEnd },
          ...(locationId ? { locationId } : {}),
          definition: { key: registerKey },
        },
      });
      sourceValues.set(slug, value);
    }

    const activeActionWhere = {
      organisationId: context.organisation.id,
      archivedAt: null,
      status: { notIn: [ActionStatus.COMPLETED, ActionStatus.CANCELLED, ActionStatus.ARCHIVED] },
      ...(locationId ? { locationId } : {}),
    };
    sourceValues.set("open-actions", await db.action.count({ where: activeActionWhere }));
    sourceValues.set("overdue-actions", await db.action.count({
      where: { ...activeActionWhere, dueDate: { lt: asOf } },
    }));

    const activeStaff = await db.staffMember.findMany({
      where: {
        organisationId: context.organisation.id,
        archivedAt: null,
        employmentStatus: "ACTIVE",
        ...(locationId ? { locationId } : {}),
      },
      select: {
        records: {
          where: { type: { in: Object.values(WORKFORCE_KPI_TYPES) as never[] } },
          select: { type: true, outcome: true, expiryDate: true, nextDueDate: true },
        },
      },
    });
    for (const [slug, type] of Object.entries(WORKFORCE_KPI_TYPES)) {
      const current = activeStaff.filter((staff) =>
        staff.records.some((record) => record.type === type && isCurrentComplianceRecord(record, monthEnd)),
      ).length;
      const percentage = compliancePercentage(current, activeStaff.length);
      if (percentage !== null) sourceValues.set(slug, percentage);
    }

    const auditWhere = {
      organisationId: context.organisation.id,
      archivedAt: null,
      auditDate: { gte: reportingMonth, lt: monthEnd },
      ...(locationId ? { locationId } : {}),
    };
    const auditTotal = await db.audit.count({ where: auditWhere });
    if (auditTotal > 0) {
      const completed = await db.audit.count({
        where: { ...auditWhere, status: { in: ["COMPLETED", "CLOSED"] } },
      });
      sourceValues.set("audit-completion", compliancePercentage(completed, auditTotal) ?? 0);
    }

    if (!locationId) {
      const policyTotal = await db.policy.count({
        where: { organisationId: context.organisation.id, archivedAt: null, status: { not: "ARCHIVED" } },
      });
      if (policyTotal > 0) {
        const compliant = await db.policy.count({
          where: {
            organisationId: context.organisation.id,
            archivedAt: null,
            status: "APPROVED",
            approvalStatus: "APPROVED",
            OR: [{ nextReviewDate: null }, { nextReviewDate: { gte: monthEnd } }],
          },
        });
        sourceValues.set("policy-compliance", compliancePercentage(compliant, policyTotal) ?? 0);
      }
    }

    let updated = 0;
    for (const definition of definitions) {
      const value = sourceValues.get(definition.slug);
      if (value === undefined) continue;
      const existing = await db.kpiEntry.findFirst({
        where: { kpiId: definition.id, locationId, reportingMonth },
      });
      if (existing && !existing.notes?.startsWith(AUTO_SYNC_NOTE_PREFIX)) continue;
      const ragStatus = calculateKpiRag({
        actual: value,
        direction: definition.direction,
        greenThreshold: definition.greenThreshold,
        amberThreshold: definition.amberThreshold,
      });
      const notes = `${AUTO_SYNC_NOTE_PREFIX} ${kpiAutoSource(definition.slug)}. Refreshes when connected figures are refreshed.`;
      const data = {
        organisationId: context.organisation.id,
        locationId,
        kpiId: definition.id,
        reportingMonth,
        actualValue: value,
        targetValue: definition.targetValue,
        greenThreshold: definition.greenThreshold,
        amberThreshold: definition.amberThreshold,
        ragStatus: ragStatus as KpiRagStatus,
        notes,
        createdById: context.user.id,
      };
      if (existing) await db.kpiEntry.update({ where: { id: existing.id }, data });
      else await db.kpiEntry.create({ data });
      updated++;
    }
    return NextResponse.json({ updated, available: sourceValues.size });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connected KPI figures could not be refreshed." },
      { status: 400 },
    );
  } finally {
    await db.$disconnect();
  }
}
