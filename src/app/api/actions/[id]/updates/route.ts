import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { syncActionEvidence } from "@/lib/action-evidence";
import { ACTION_STATUSES, actionScopeWhere } from "@/lib/actions";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT]);
  const { id } = await params, form = await request.formData(), db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    if (!hasPermission(context.permissions, PERMISSIONS.ACTIONS_MANAGE) && action.ownerId !== context.user.id) return NextResponse.json({ error: "You can update only actions assigned to you." }, { status: 403 });
    const note = String(form.get("note") ?? "").trim(), status = String(form.get("status") ?? "IN_PROGRESS");
    const progressPercent = Math.round(Number(form.get("progressPercent") ?? action.progressPercent));
    const nextStep = String(form.get("nextStep") ?? "").trim() || null, blocker = String(form.get("blocker") ?? "").trim() || null;
    const evidenceId = String(form.get("evidenceId") ?? "") || null;
    if (note.length < 3) throw new Error("Describe what has changed since the last update.");
    if (!ACTION_STATUSES.filter((item) => !["OVERDUE", "ARCHIVED"].includes(item)).includes(status as never)) throw new Error("Choose a valid progress status.");
    if (!Number.isFinite(progressPercent) || progressPercent < 0 || progressPercent > 100) throw new Error("Progress must be between 0 and 100%.");
    if (status === "BLOCKED" && !blocker) throw new Error("Record what is blocking the action.");
    if (evidenceId && !(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("The selected evidence could not be found.");
    await db.$transaction(async (tx) => {
      await tx.actionUpdate.create({ data: { actionId: id, userId: context.user.id, note, status: status as never, progressPercent, nextStep, blocker, evidenceId } });
      const updated = await tx.action.update({ where: { id }, data: { status: status as never, progressPercent, progressNote: note, ...(status === "COMPLETED" && !action.completionDate ? { completionDate: new Date() } : {}) } });
      if (evidenceId) await tx.actionEvidence.upsert({ where: { actionId_evidenceId: { actionId: id, evidenceId } }, update: {}, create: { actionId: id, evidenceId } });
      await syncActionEvidence(tx, { actionId: id, organisationId: action.organisationId, locationId: action.locationId, reference: action.reference, title: action.title, description: action.description, category: action.category, sourceType: action.sourceType, sourceReference: action.sourceReference, ownerId: action.ownerId, actorId: context.user.id, dueDate: action.dueDate, reviewDate: action.reviewDate, status, priority: action.priority, progressPercent, expectedOutcome: action.expectedOutcome, successMeasure: action.successMeasure, archived: false });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: "UPDATE", recordType: "ActionUpdate", recordId: id, summary: `Updated action progress: ${action.reference}`, afterValue: { status, progressPercent, nextStep, blocker, evidenceId, updatedStatus: updated.status } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add update." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
