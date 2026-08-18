import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { validateRootCauseReview } from "@/lib/assurance-improvement";
import { createDb } from "@/lib/db";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) }, include: { rootCauseReview: true } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    const input = { method: text(form, "method"), problemStatement: text(form, "problemStatement"), immediateCauses: lines(form, "immediateCauses"), contributingFactors: lines(form, "contributingFactors"), systemCauses: lines(form, "systemCauses"), lessons: text(form, "lessons"), preventiveControls: text(form, "preventiveControls") };
    validateRootCauseReview(input);
    const approve = form.get("approve") === "true";
    if (approve && ![ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.QUALITY_MANAGER].includes(context.role.key as never)) throw new Error("Only an authorised manager can approve a root-cause review.");
    if (approve && ["HIGH", "CRITICAL"].includes(action.priority) && (!action.rootCauseReview || action.rootCauseReview.reviewedById === context.user.id)) throw new Error("A different authorised manager must approve a high or critical root-cause review after it has been completed.");
    const status = approve ? "APPROVED" : "COMPLETED", now = new Date();
    const reviewedById = approve && action.rootCauseReview ? action.rootCauseReview.reviewedById : context.user.id;
    await db.$transaction(async (tx) => {
      await tx.rootCauseReview.upsert({ where: { actionId: id }, create: { organisationId: context.organisation.id, locationId: action.locationId, actionId: id, ...input, status, reviewedById, approvedById: approve ? context.user.id : null, approvedAt: approve ? now : null }, update: { ...input, status, reviewedById, approvedById: approve ? context.user.id : null, approvedAt: approve ? now : null } });
      await tx.action.update({ where: { id }, data: { rootCause: [...input.immediateCauses, ...input.contributingFactors, ...input.systemCauses].join("; ") } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: approve ? "APPROVAL" : "UPDATE", recordType: "RootCauseReview", recordId: id, summary: `${approve ? "Approved" : "Completed"} root-cause review for ${action.reference}`, afterValue: { method: input.method, status, causeCounts: { immediate: input.immediateCauses.length, contributing: input.contributingFactors.length, system: input.systemCauses.length } } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the root-cause review." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function lines(form: FormData, key: string) { return text(form, key).split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
