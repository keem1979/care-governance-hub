import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), form = await request.formData(), db = createDb();
  try {
    const title = text(form, "title"), objective = text(form, "objective"), rationale = text(form, "rationale"), ownerId = text(form, "ownerId"), targetDate = parseOptionalDate(form.get("targetDate")), locationId = text(form, "locationId") || null;
    const successMeasures = lines(form, "successMeasures"), actionIds = [...new Set(form.getAll("actionIds").map(String).filter(Boolean))];
    if (title.length < 3 || objective.length < 12 || rationale.length < 12 || !ownerId || !targetDate || successMeasures.length < 1 || actionIds.length < 1) throw new Error("Complete the plan objective, rationale, owner, target date, success measures and at least one action.");
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised location.");
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active plan owner.");
    if (await db.action.count({ where: { ...actionScopeWhere(context), id: { in: actionIds } } }) !== actionIds.length) throw new Error("One or more selected actions are outside your authorised scope.");
    const plan = await db.$transaction(async (tx) => {
      const counter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: context.organisation.id, key: "IMPROVEMENT_PLAN" } }, create: { organisationId: context.organisation.id, key: "IMPROVEMENT_PLAN", currentValue: 1 }, update: { currentValue: { increment: 1 } } });
      const reference = `IMP-${new Date().getUTCFullYear()}-${String(counter.currentValue).padStart(4, "0")}`;
      const created = await tx.improvementPlan.create({ data: { organisationId: context.organisation.id, locationId, reference, title, objective, rationale, ownerId, successMeasures, baseline: text(form, "baseline") || null, target: text(form, "target") || null, targetDate, status: "ACTIVE", createdById: context.user.id, actions: { create: actionIds.map((actionId) => ({ actionId })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "ImprovementPlan", recordId: created.id, summary: `Created improvement plan ${reference}: ${title}`, afterValue: { ownerId, targetDate, actionCount: actionIds.length, successMeasures } } });
      return created;
    });
    return NextResponse.json({ id: plan.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the improvement plan." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function lines(form: FormData, key: string) { return text(form, key).split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
