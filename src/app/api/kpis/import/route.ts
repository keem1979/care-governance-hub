import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { calculateKpiRag, parseCsv, parseKpiMonth } from "@/lib/kpis";
import { PERMISSIONS } from "@/lib/permissions";
import { isAutoCalculatedKpi } from "@/lib/commissioner-kpis";
import { normaliseKpiSourceType, normaliseKpiSourceUrl } from "@/lib/kpi-sources";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const file = form.get("file");
  const db = createDb();
  try {
    if (!(file instanceof File) || !file.size || file.size > 1024 * 1024) throw new Error("Choose a CSV file no larger than 1 MB.");
    const rows = parseCsv(await file.text());
    const header = rows.shift()?.map((item) => item.toLowerCase().replaceAll(" ", "_")) ?? [];
    const required = ["kpi", "month", "actual", "source"];
    if (!required.every((name) => header.includes(name))) throw new Error("CSV must include kpi, month, actual and source columns.");
    if (rows.length > 500) throw new Error("Import no more than 500 rows at a time.");
    const [definitions, locations] = await Promise.all([
      db.kpiDefinition.findMany({ where: { organisationId: context.organisation.id, isActive: true } }),
      db.serviceLocation.findMany({ where: { organisationId: context.organisation.id, id: { in: context.locations.map((item) => item.id) }, isActive: true } }),
    ]);
    const records = rows.map((row, index) => {
      const value = (name: string) => row[header.indexOf(name)] ?? "";
      const kpiText = value("kpi").toLowerCase();
      const definition = definitions.find((item) => item.slug === kpiText || item.name.toLowerCase() === kpiText);
      if (!definition) throw new Error(`Row ${index + 2}: KPI was not found.`);
      if (isAutoCalculatedKpi(definition.slug)) throw new Error(`Row ${index + 2}: ${definition.name} is calculated automatically from its source figures.`);
      const locationText = value("location").toLowerCase();
      const location = locationText ? locations.find((item) => item.name.toLowerCase() === locationText || item.code.toLowerCase() === locationText) : null;
      if (locationText && !location) throw new Error(`Row ${index + 2}: location was not found.`);
      const actualValue = Number(value("actual")), targetValue = value("target") === "" ? definition.targetValue : Number(value("target")), greenThreshold = value("green_threshold") === "" ? definition.greenThreshold : Number(value("green_threshold")), amberThreshold = value("amber_threshold") === "" ? definition.amberThreshold : Number(value("amber_threshold"));
      const ragStatus = calculateKpiRag({ actual: actualValue, direction: definition.direction, greenThreshold, amberThreshold });
      let sourceType: string;
      let sourceUrl: string | null;
      try {
        sourceType = normaliseKpiSourceType(value("source"));
        sourceUrl = normaliseKpiSourceUrl(value("source_link"));
      } catch (error) {
        throw new Error(`Row ${index + 2}: ${error instanceof Error ? error.message : "source is invalid."}`);
      }
      return { definition, locationId: location?.id ?? null, reportingMonth: parseKpiMonth(value("month")), actualValue, targetValue, greenThreshold, amberThreshold, ragStatus, notes: value("notes") || null, sourceType, sourceUrl };
    });
    await db.$transaction(async (tx) => {
      for (const record of records) {
        const existing = await tx.kpiEntry.findFirst({ where: { kpiId: record.definition.id, locationId: record.locationId, reportingMonth: record.reportingMonth } });
        const data = { organisationId: context.organisation.id, locationId: record.locationId, kpiId: record.definition.id, reportingMonth: record.reportingMonth, actualValue: record.actualValue, targetValue: record.targetValue, greenThreshold: record.greenThreshold, amberThreshold: record.amberThreshold, ragStatus: record.ragStatus as never, notes: record.notes, sourceType: record.sourceType, sourceUrl: record.sourceUrl, createdById: context.user.id };
        if (existing) await tx.kpiEntry.update({ where: { id: existing.id }, data });
        else await tx.kpiEntry.create({ data });
      }
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "KpiEntry", summary: `Imported ${records.length} KPI rows from CSV.` } });
    });
    return NextResponse.json({ imported: records.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not import KPI data." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
