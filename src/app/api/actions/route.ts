import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { resolveActionSource } from "@/lib/action-sources";
import { syncActionEvidence } from "@/lib/action-evidence";
import { ACTION_CATEGORIES, ACTION_PRIORITIES, ACTION_SOURCE_TYPES, ACTION_STATUSES, makeActionReference, validateActionClosure } from "@/lib/actions";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE);
  const form = await request.formData();
  const db = createDb();
  try {
    const title = text(form, "title"), description = text(form, "description"), ownerId = text(form, "ownerId");
    const locationId = text(form, "locationId") || null, category = text(form, "category") || ACTION_CATEGORIES[0];
    const priority = text(form, "priority") || "MEDIUM", status = text(form, "status") || "OPEN";
    const dueDate = parseOptionalDate(form.get("dueDate")), reviewDate = parseOptionalDate(form.get("reviewDate"));
    const progressPercent = number(form, "progressPercent", 0), expectedOutcome = text(form, "expectedOutcome"), successMeasure = text(form, "successMeasure");
    if (title.length < 3 || description.length < 3) throw new Error("Describe the action and the work required.");
    if (!expectedOutcome || !successMeasure) throw new Error("Add the expected outcome and how success will be measured.");
    if (!ownerId || !dueDate) throw new Error("Choose an accountable owner and due date.");
    if (!ACTION_CATEGORIES.includes(category as never) || !ACTION_PRIORITIES.includes(priority as never) || !ACTION_STATUSES.filter((item) => !["OVERDUE", "ARCHIVED"].includes(item)).includes(status as never)) throw new Error("Choose valid action values.");
    if (progressPercent < 0 || progressPercent > 100) throw new Error("Progress must be between 0 and 100%.");
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active owner.");
    const [sourceType, rawId] = String(form.get("source") ?? "MANUAL:").split(":", 2);
    if (!ACTION_SOURCE_TYPES.includes(sourceType as never)) throw new Error("Choose a valid source.");
    const source = await resolveActionSource(db, context.organisation.id, sourceType, rawId || null);
    const evidenceIds = [...new Set([...form.getAll("evidenceIds").map(String).filter(Boolean), ...(sourceType === "EVIDENCE" && rawId ? [rawId] : [])])];
    const evidenceCount = evidenceIds.length ? await db.evidence.count({ where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context) } }) : 0;
    if (evidenceCount !== evidenceIds.length) throw new Error("One or more linked evidence records could not be found.");
    const verifiedById = text(form, "verifiedById") || null;
    if (verifiedById && !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: verifiedById, status: "ACTIVE" } }))) throw new Error("Choose an active verifier.");
    const verificationDate = parseOptionalDate(form.get("verificationDate")), closureNote = text(form, "closureNote") || null, evidenceWaiverExplanation = text(form, "evidenceWaiverExplanation") || null;
    const escalationRequired = form.get("escalationRequired") === "true", escalationReason = text(form, "escalationReason") || null;
    if (escalationRequired && !escalationReason) throw new Error("Explain why this action needs escalation.");
    validateActionClosure({ status, evidenceCount, waiver: evidenceWaiverExplanation ?? undefined, closureNote: closureNote ?? undefined, verifiedById: verifiedById ?? undefined, verificationDate });
    const reference = text(form, "reference") || makeActionReference();
    const action = await db.$transaction(async (tx) => {
      const created = await tx.action.create({ data: { organisationId: context.organisation.id, locationId, reference, title, description, category, rootCause: text(form, "rootCause") || null, expectedOutcome, successMeasure, sourceType: sourceType as never, sourceRecordId: rawId || null, sourceReference: source.reference, sourceUrl: source.url, ownerId, priority: priority as never, dueDate, reviewDate, status: status as never, progressPercent, progressNote: text(form, "progressNote") || null, escalationRequired, escalationReason, evidenceRequired: form.get("evidenceRequired") !== "false", evidenceWaiverExplanation, completionDate: parseOptionalDate(form.get("completionDate")), verifiedById, verificationDate, closureNote, createdById: context.user.id, evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      await tx.actionUpdate.create({ data: { actionId: created.id, userId: context.user.id, note: "Action created and connected to the improvement record.", status: created.status, progressPercent } });
      await syncActionEvidence(tx, { actionId: created.id, organisationId: created.organisationId, locationId, reference, title, description, category, sourceType, sourceReference: source.reference, ownerId, actorId: context.user.id, dueDate, reviewDate, status, priority, progressPercent, expectedOutcome, successMeasure, archived: false });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "Action", recordId: created.id, summary: `Created action: ${reference} — ${title}`, afterValue: { status, priority, dueDate, sourceType, progressPercent } } });
      return created;
    });
    return NextResponse.json({ id: action.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create action." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function number(form: FormData, key: string, fallback: number) { const value = Number(form.get(key)); return Number.isFinite(value) ? Math.round(value) : fallback; }
