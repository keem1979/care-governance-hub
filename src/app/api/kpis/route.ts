import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { calculateKpiRag, monthKey, parseKpiMonth } from "@/lib/kpis";
import { PERMISSIONS } from "@/lib/permissions";
import { isAutoCalculatedKpi } from "@/lib/commissioner-kpis";
import { normaliseKpiSourceType, normaliseKpiSourceUrl } from "@/lib/kpi-sources";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const db = createDb();
  try {
    const kpiId = String(form.get("kpiId") ?? "");
    const reportingMonth = parseKpiMonth(form.get("reportingMonth"));
    const locationId = String(form.get("locationId") ?? "") || null;
    const actualValue = Number(form.get("actualValue")), targetValue = Number(form.get("targetValue")), greenThreshold = Number(form.get("greenThreshold")), amberThreshold = Number(form.get("amberThreshold"));
    const notes = String(form.get("notes") ?? "").trim() || null;
    const sourceType = normaliseKpiSourceType(form.get("sourceType"));
    const sourceUrl = normaliseKpiSourceUrl(form.get("sourceUrl"));
    const definition = await db.kpiDefinition.findFirst({ where: { id: kpiId, organisationId: context.organisation.id, isActive: true } });
    if (!definition) throw new Error("Choose a valid KPI.");
    if (isAutoCalculatedKpi(definition.slug)) throw new Error("This rate is calculated automatically from its source figures.");
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");
    if (![actualValue, targetValue, greenThreshold, amberThreshold].every(Number.isFinite)) throw new Error("Enter valid KPI values and thresholds.");
    const ragStatus = calculateKpiRag({ actual: actualValue, direction: definition.direction, greenThreshold, amberThreshold });
    const evidenceIds = form.getAll("evidenceIds").map(String).filter(Boolean);
    for (const evidenceId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const existing = await db.kpiEntry.findFirst({ where: { kpiId, locationId, reportingMonth } });
    const entry = await db.$transaction(async (tx) => {
      const data = { organisationId: context.organisation.id, locationId, kpiId, reportingMonth, actualValue, targetValue, greenThreshold, amberThreshold, ragStatus: ragStatus as never, notes, sourceType, sourceUrl, createdById: context.user.id };
      const saved = existing ? await tx.kpiEntry.update({ where: { id: existing.id }, data: { ...data, evidenceLinks: { deleteMany: {}, create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } }) : await tx.kpiEntry.create({ data: { ...data, evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: existing ? "UPDATE" : "CREATE", recordType: "KpiEntry", recordId: saved.id, summary: `${existing ? "Updated" : "Recorded"} KPI: ${definition.name} for ${monthKey(reportingMonth)}`, afterValue: { actualValue, targetValue, greenThreshold, amberThreshold, ragStatus, sourceType, sourceUrl } } });
      return saved;
    });
    return NextResponse.json({ id: entry.id, month: monthKey(reportingMonth), ragStatus }, { status: existing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save KPI entry." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
