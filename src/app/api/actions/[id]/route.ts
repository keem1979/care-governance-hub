import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { linkActionEvidence } from "@/lib/action-assurance";
import { resolveActionSource } from "@/lib/action-sources";
import { syncActionEvidence } from "@/lib/action-evidence";
import { syncFindingFromAction } from "@/lib/assurance-improvement";
import { ACTION_CATEGORIES, ACTION_PRIORITIES, ACTION_SOURCE_TYPES, ACTION_STATUSES, actionScopeWhere } from "@/lib/actions";
import { lifecycleForAction, MEDICATION_ISSUE_TYPES, normaliseIssueKey } from "@/lib/closure-loop";
import { clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) }, include: { evidenceLinks: true } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json() as { intent?: string };
      if (!["archive", "restore"].includes(body.intent ?? "")) throw new Error("Unknown action.");
      const archived = body.intent === "archive", status = archived ? "ARCHIVED" : "OPEN";
      await db.$transaction(async (tx) => {
        const updated = await tx.action.update({ where: { id }, data: { status, archivedAt: archived ? new Date() : null } });
        await syncFindingFromAction(tx, updated);
        await tx.actionUpdate.create({ data: { actionId: id, userId: context.user.id, note: archived ? "Action archived." : "Action restored.", status } });
        await syncActionEvidence(tx, { actionId: id, organisationId: action.organisationId, locationId: action.locationId, reference: action.reference, title: action.title, description: action.description, category: action.category, sourceType: action.sourceType, sourceReference: action.sourceReference, ownerId: action.ownerId, actorId: context.user.id, dueDate: action.dueDate, reviewDate: action.reviewDate, status, priority: action.priority, progressPercent: action.progressPercent, expectedOutcome: action.expectedOutcome, successMeasure: action.successMeasure, archived });
        await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: archived ? "ARCHIVE" : "RESTORE", recordType: "Action", recordId: id, summary: `${archived ? "Archived" : "Restored"} action: ${action.reference}` } });
      });
      return NextResponse.json({ ok: true });
    }
    if (action.closedAt) throw new Error("Closed Actions are read-only. Reopen the Action through its Assurance chronology first.");
    const form = await request.formData(), title = text(form, "title"), description = text(form, "description"), ownerId = text(form, "ownerId"), oversightOwnerId = text(form, "oversightOwnerId");
    const locationId = text(form, "locationId") || null, category = text(form, "category") || ACTION_CATEGORIES[0];
    const priority = text(form, "priority") || "MEDIUM", status = text(form, "status") || "OPEN";
    const dueDate = parseOptionalDate(form.get("dueDate")), reviewDate = parseOptionalDate(form.get("reviewDate"));
    const progressPercent = Math.round(Number(form.get("progressPercent") ?? action.progressPercent));
    const expectedOutcome = text(form, "expectedOutcome"), successMeasure = text(form, "successMeasure");
    if (title.length < 3 || description.length < 3 || !ownerId || !oversightOwnerId || !dueDate) throw new Error("Enter the action details, delivery owner, oversight lead and due date.");
    if (!expectedOutcome || !successMeasure) throw new Error("Add the expected outcome and how success will be measured.");
    if (!ACTION_CATEGORIES.includes(category as never) || !ACTION_PRIORITIES.includes(priority as never) || !ACTION_STATUSES.filter((item) => !["OVERDUE", "ARCHIVED", "COMPLETED"].includes(item)).includes(status as never)) throw new Error("Choose valid action values. Closure is a separate authorised assurance decision.");
    if (!Number.isFinite(progressPercent) || progressPercent < 0 || progressPercent > 100) throw new Error("Progress must be between 0 and 100%.");
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active delivery owner.");
    const oversightOwner = await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: oversightOwnerId, status: "ACTIVE" }, include: { role: { select: { key: true } } } });
    if (!oversightOwner || ![ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.OWNER, ROLE_KEYS.NOMINATED_INDIVIDUAL, ROLE_KEYS.QUALITY_MANAGER].includes(oversightOwner.role.key as never)) throw new Error("Choose an active Registered Manager or authorised senior oversight lead.");
    const [sourceType, rawId] = String(form.get("source") ?? "MANUAL:").split(":", 2);
    if (!ACTION_SOURCE_TYPES.includes(sourceType as never)) throw new Error("Choose a valid source.");
    const source = await resolveActionSource(db, context, sourceType, rawId || null);
    if (source.locationId && locationId !== source.locationId) throw new Error("The action location must match its source record.");
    const requestedClientId = text(form, "clientId") || null;
    if (source.clientId && requestedClientId && source.clientId !== requestedClientId) throw new Error("The person selected must match the source record.");
    const clientId = source.clientId ?? requestedClientId;
    if (clientId) {
      const client = await db.client.findFirst({ where: { id: clientId, ...clientScopeWhere(context) }, select: { locationId: true } });
      if (!client) throw new Error("Choose an authorised client record.");
      if (client.locationId && client.locationId !== locationId) throw new Error("The action service or branch must match the selected client.");
    }
    const evidenceIds = [...new Set([...form.getAll("evidenceIds").map(String).filter(Boolean), ...(sourceType === "EVIDENCE" && rawId ? [rawId] : [])])];
    const evidenceCount = evidenceIds.length ? await db.evidence.count({ where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context) } }) : 0;
    if (evidenceCount !== evidenceIds.length) throw new Error("One or more linked evidence records could not be found.");
    const managementResponse = text(form, "managementResponse") || null;
    const monitoringUntil = parseOptionalDate(form.get("monitoringUntil")), nextRecurrenceReviewDate = parseOptionalDate(form.get("nextRecurrenceReviewDate"));
    const medicationIssueType = text(form, "medicationIssueType") || null;
    if (medicationIssueType && !MEDICATION_ISSUE_TYPES.includes(medicationIssueType as never)) throw new Error("Choose a valid medication issue type.");
    const issueKey = text(form, "issueKey") || normaliseIssueKey(`${category} ${title}`) || null;
    const escalationRequired = form.get("escalationRequired") === "true", escalationReason = text(form, "escalationReason") || null;
    if (escalationRequired && !escalationReason) throw new Error("Explain why this action needs escalation.");
    const lifecycleStatus = action.verificationDate ? action.lifecycleStatus : lifecycleForAction({ actionStatus: status, managementResponse, evidenceCount, verified: false, monitoringUntil });
    await db.$transaction(async (tx) => {
      const updated = await tx.action.update({ where: { id }, data: { locationId, clientId, staffMemberId: source.staffMemberId, title, description, category, rootCause: text(form, "rootCause") || null, expectedOutcome, successMeasure, sourceType: sourceType as never, sourceRecordId: rawId || null, sourceReference: source.reference, sourceUrl: source.url, lifecycleStatus: lifecycleStatus as never, issueKey, medicationIssueType: medicationIssueType as never, monitoringUntil, managementResponse, managementResponseById: managementResponse ? context.user.id : null, managementResponseAt: managementResponse ? new Date() : null, ownerId, oversightOwnerId, priority: priority as never, dueDate, reviewDate, status: status as never, progressPercent, progressNote: text(form, "progressNote") || null, escalationRequired, escalationReason, evidenceRequired: true, evidenceWaiverExplanation: null, nextRecurrenceReviewDate } });
      await linkActionEvidence(tx, { actionId: id, organisationId: action.organisationId, evidenceIds, role: "SOURCE", actorId: context.user.id });
      await syncFindingFromAction(tx, updated);
      if (status !== action.status || progressPercent !== action.progressPercent) await tx.actionUpdate.create({ data: { actionId: id, userId: context.user.id, note: `Action updated: ${action.status} to ${status}; progress ${progressPercent}%.`, status: status as never, progressPercent } });
      await syncActionEvidence(tx, { actionId: id, organisationId: action.organisationId, locationId, reference: action.reference, title, description, category, sourceType, sourceReference: source.reference, ownerId, actorId: context.user.id, dueDate, reviewDate, status, priority, progressPercent, expectedOutcome, successMeasure, archived: false });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "Action", recordId: id, summary: `Updated action: ${action.reference}`, beforeValue: { status: action.status, lifecycleStatus: action.lifecycleStatus, ownerId: action.ownerId, oversightOwnerId: action.oversightOwnerId, clientId: action.clientId, progressPercent: action.progressPercent }, afterValue: { status, lifecycleStatus, ownerId, oversightOwnerId, clientId, priority, dueDate, progressPercent } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update action." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
