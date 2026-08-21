import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { RISK_CATEGORY_DEFINITIONS, riskFrameworkDraftSchema } from "@/lib/risk-framework";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE); const db = createDb();
  try {
    const input = riskFrameworkDraftSchema.parse(await request.json());
    const open = await db.riskFrameworkVersion.findFirst({ where: { organisationId: context.organisation.id, status: { in: ["DRAFT", "IN_REVIEW", "APPROVED"] } } });
    if (open) return NextResponse.json({ error: `Framework v${open.versionNumber} must be completed before another draft is created.` }, { status: 409 });
    const roleKeys = [...new Set(input.closureRules.flatMap((rule) => [...rule.proposerRoleKeys, ...rule.approverRoleKeys]))];
    const validRoles = await db.role.count({ where: { key: { in: roleKeys } } });
    if (validRoles !== roleKeys.length) return NextResponse.json({ error: "A selected closure authority role is no longer available." }, { status: 400 });
    const maximum = await db.riskFrameworkVersion.aggregate({ where: { organisationId: context.organisation.id }, _max: { versionNumber: true } });
    const versionNumber = (maximum._max.versionNumber ?? 0) + 1;
    const labels = new Map(RISK_CATEGORY_DEFINITIONS);
    const framework = await db.$transaction(async (tx) => {
      const policy = await tx.riskClosurePolicyVersion.create({ data: { organisationId: context.organisation.id, versionNumber, effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`), changeRationale: input.changeRationale, createdById: context.user.id, rules: { create: input.closureRules.map((rule) => ({ organisationId: context.organisation.id, ...rule })) } } });
      const created = await tx.riskFrameworkVersion.create({ data: { organisationId: context.organisation.id, versionNumber, effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`), defaultAppetite: input.defaultAppetite, defaultToleranceScore: input.defaultToleranceScore, defaultEscalation: input.defaultEscalation ?? null, changeRationale: input.changeRationale, closurePolicyVersionId: policy.id, createdById: context.user.id, rules: { create: input.categoryRules.map((rule) => ({ organisationId: context.organisation.id, categoryKey: rule.categoryKey, categoryLabel: labels.get(rule.categoryKey)!, appetite: rule.appetite, toleranceScore: rule.toleranceScore, escalationIndicator: rule.escalationIndicator ?? null })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "RiskFrameworkVersion", recordId: created.id, summary: `Created Risk Framework v${versionNumber} draft`, afterValue: { versionNumber, effectiveFrom: input.effectiveFrom, categoryRuleCount: input.categoryRules.length, closureRuleCount: input.closureRules.length } } });
      return created;
    });
    return NextResponse.json({ id: framework.id, versionNumber }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the Risk Framework draft." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
