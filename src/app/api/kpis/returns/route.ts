import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { KpiRagStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { parseKpiReturnForm, validateKpiReturn } from "@/lib/kpi-suite";
import { COMMISSIONER_KPI_SOURCE, commissionerKpiValues } from "@/lib/commissioner-kpis";
import { monthKey, parseKpiMonth, calculateKpiRag } from "@/lib/kpis";
import { AUTO_SYNC_NOTE_PREFIX } from "@/lib/kpi-sync";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const db = createDb();
  try {
    const id = String(form.get("id") ?? "") || undefined;
    const locationId = String(form.get("locationId") ?? "");
    const reportingMonth = parseKpiMonth(form.get("reportingMonth"));
    const localAuthority = String(form.get("localAuthority") ?? "").trim();
    const intent = String(form.get("intent") ?? "draft");
    if (!context.locations.some((location) => location.id === locationId)) throw new Error("Choose a branch you are authorised to manage.");
    if (!localAuthority) throw new Error("Enter the commissioner or contract owner.");
    const data = parseKpiReturnForm(form);
    const errors = validateKpiReturn(data);
    if (intent !== "draft" && errors.length) throw new Error(`Resolve these checks before progressing: ${errors.join(" ")}`);
    const requestedStatus = intent === "submit" ? "SUBMITTED" : intent === "review" ? "READY_FOR_REVIEW" : "DRAFT";
    const existing = id
      ? await db.kpiReturn.findFirst({ where: { id, organisationId: context.organisation.id } })
      : await db.kpiReturn.findFirst({ where: { organisationId: context.organisation.id, locationId, reportingMonth } });
    if (existing?.status === "LOCKED") throw new Error("This return is locked.");
    const saved = await db.$transaction(async (tx) => {
      const values = {
        organisationId: context.organisation.id,
        locationId,
        reportingMonth,
        localAuthority,
        contractName: text(form, "contractName"),
        providerCode: text(form, "providerCode"),
        locationCode: text(form, "locationCode"),
        ecmSystem: text(form, "ecmSystem"),
        managerComment: text(form, "managerComment"),
        status: requestedStatus as "DRAFT" | "READY_FOR_REVIEW" | "SUBMITTED",
        data: data as Prisma.InputJsonValue,
        submittedAt: requestedStatus === "SUBMITTED" ? new Date() : existing?.submittedAt ?? null,
        submittedById: requestedStatus === "SUBMITTED" ? context.user.id : existing?.submittedById ?? null,
      };
      const result = existing
        ? await tx.kpiReturn.update({ where: { id: existing.id }, data: values })
        : await tx.kpiReturn.create({ data: { ...values, createdById: context.user.id } });
      const commissionerValues = commissionerKpiValues(data);
      const definitions = await tx.kpiDefinition.findMany({
        where: {
          organisationId: context.organisation.id,
          slug: { in: [...commissionerValues.keys()] },
          isActive: true,
        },
      });
      for (const definition of definitions) {
        const actualValue = commissionerValues.get(definition.slug);
        if (actualValue === undefined) continue;
        const ragStatus = calculateKpiRag({
          actual: actualValue,
          direction: definition.direction,
          greenThreshold: definition.greenThreshold,
          amberThreshold: definition.amberThreshold,
        });
        const entry = await tx.kpiEntry.findFirst({
          where: { kpiId: definition.id, locationId, reportingMonth },
          select: { id: true },
        });
        const entryData = {
          organisationId: context.organisation.id,
          locationId,
          kpiId: definition.id,
          reportingMonth,
          actualValue,
          targetValue: definition.targetValue,
          greenThreshold: definition.greenThreshold,
          amberThreshold: definition.amberThreshold,
          ragStatus: ragStatus as KpiRagStatus,
          notes: `${AUTO_SYNC_NOTE_PREFIX} ${COMMISSIONER_KPI_SOURCE}.`,
          sourceType: "MONTHLY_PERFORMANCE_RETURN",
          sourceUrl: `/kpis/returns/${result.id}`,
          createdById: context.user.id,
        };
        if (entry) await tx.kpiEntry.update({ where: { id: entry.id }, data: entryData });
        else await tx.kpiEntry.create({ data: entryData });
      }
      await tx.activityLog.create({ data: {
        organisationId: context.organisation.id,
        locationId,
        userId: context.user.id,
        action: existing ? "UPDATE" : "CREATE",
        recordType: "KpiReturn",
        recordId: result.id,
        summary: `${existing ? "Updated" : "Created"} monthly KPI return for ${monthKey(reportingMonth)}`,
        afterValue: {
          status: requestedStatus,
          localAuthority,
          validationIssues: errors.length,
          commissionerKpisSynced: definitions.length,
        },
      } });
      return result;
    });
    return NextResponse.json({ id: saved.id, status: saved.status }, { status: existing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The monthly KPI return could not be saved." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim() || null;
}
