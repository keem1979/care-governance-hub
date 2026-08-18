import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const locationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id: locationId }) => locationId) } }] };
    const plan = await db.improvementPlan.findFirst({ where: { id, organisationId: context.organisation.id, archivedAt: null, ...locationScope }, include: { actions: { include: { action: { select: { lifecycleStatus: true } } } } } });
    if (!plan) return NextResponse.json({ error: "Improvement plan not found." }, { status: 404 });
    const status = text(form, "status"), progressSummary = text(form, "progressSummary"), outcome = text(form, "outcome") || null;
    if (!["DRAFT", "ACTIVE", "AT_RISK", "COMPLETED"].includes(status) || progressSummary.length < 8) throw new Error("Choose a valid status and record a meaningful progress summary.");
    if (status === "COMPLETED") {
      if (!outcome || outcome.length < 12) throw new Error("Record the measured improvement outcome before completion.");
      const unfinished = plan.actions.filter(({ action }) => action.lifecycleStatus !== "SUSTAINED_IMPROVEMENT").length;
      if (unfinished) throw new Error(`${unfinished} linked action${unfinished === 1 ? " has" : "s have"} not reached sustained improvement.`);
    }
    const now = new Date();
    await db.$transaction([
      db.improvementPlan.update({ where: { id }, data: { status: status as never, progressSummary, outcome, completedAt: status === "COMPLETED" ? now : null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: plan.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "ImprovementPlan", recordId: id, summary: `Updated improvement plan ${plan.reference} to ${status.toLowerCase().replaceAll("_", " ")}`, beforeValue: { status: plan.status }, afterValue: { status, progressSummary, outcome, completedAt: status === "COMPLETED" ? now : null } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the improvement plan." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
