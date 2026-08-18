import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { UNDERSTANDING_OUTCOMES } from "@/lib/care-workforce-assurance";
import { carePlanScopeWhere } from "@/lib/care-plans";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; checkId: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.WORKFORCE_MANAGE]);
  const { id, checkId } = await params;
  const form = await request.formData();
  const outcome = String(form.get("outcome") ?? "");
  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000);
  const method = String(form.get("method") ?? "KNOWLEDGE_QUESTION");
  if (!UNDERSTANDING_OUTCOMES.includes(outcome as never) || notes.length < 10) return NextResponse.json({ error: "Choose an outcome and record the evidence for your decision." }, { status: 400 });
  if (!["KNOWLEDGE_QUESTION", "MANAGER_OBSERVATION", "DISCUSSION"].includes(method)) return NextResponse.json({ error: "Choose a valid assessment method." }, { status: 400 });
  const db = createDb();
  try {
    const plan = await db.carePlan.findFirst({ where: { id, ...carePlanScopeWhere(context) }, select: { id: true, reference: true, locationId: true, currentVersionId: true } });
    if (!plan?.currentVersionId) return NextResponse.json({ error: "Care plan not found." }, { status: 404 });
    const check = await db.understandingCheck.findFirst({ where: { id: checkId, organisationId: context.organisation.id, requirement: { carePlanId: id, versionId: plan.currentVersionId } }, include: { requirement: true } });
    if (!check) return NextResponse.json({ error: "Understanding check not found." }, { status: 404 });
    if (check.outcome !== "AWAITING_REVIEW" || !check.submittedAt || !check.staffResponse) return NextResponse.json({ error: "The worker must submit their understanding before a manager can decide the outcome." }, { status: 409 });
    if (check.completedById === context.user.id) return NextResponse.json({ error: "A critical understanding check must be reviewed by a different authorised person." }, { status: 403 });
    const completed = outcome === "SATISFACTORY";
    await db.$transaction([
      db.understandingCheck.update({ where: { id: check.id }, data: { outcome: outcome as never, method: method as never, assessorNotes: notes, assessedById: context.user.id, assessedAt: new Date() } }),
      db.acknowledgementRequirement.update({ where: { id: check.requirementId }, data: { status: completed ? "COMPLETE" : "SUPPORT_REQUIRED", completedAt: completed ? new Date() : null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: plan.locationId, userId: context.user.id, action: "APPROVAL", recordType: "UnderstandingCheck", recordId: check.id, summary: `Reviewed understanding check for ${plan.reference}: ${outcome.toLowerCase().replaceAll("_", " ")}`, afterValue: { outcome, method, requirementId: check.requirementId } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not review the understanding check." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
