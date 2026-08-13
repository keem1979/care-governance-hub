import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { resolveActionSource } from "@/lib/action-sources";
import { syncActionEvidence } from "@/lib/action-evidence";
import { ACTION_CATEGORIES, ACTION_PRIORITIES, ACTION_SOURCE_TYPES, ACTION_STATUSES, actionScopeWhere, makeActionReference } from "@/lib/actions";
import { lifecycleForAction, MEDICATION_ISSUE_TYPES, normaliseIssueKey, suggestActionMatches, validateVerifiedClosure } from "@/lib/closure-loop";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), form = await request.formData(), db = createDb();
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
    const source = await resolveActionSource(db, context, sourceType, rawId || null);
    if (source.locationId && locationId !== source.locationId) throw new Error("The action location must match its source record.");
    const clientId = source.clientId, staffMemberId = source.staffMemberId;
    const medicationIssueType = text(form, "medicationIssueType") || null;
    if (medicationIssueType && !MEDICATION_ISSUE_TYPES.includes(medicationIssueType as never)) throw new Error("Choose a valid medication issue type.");
    const issueKey = text(form, "issueKey") || normaliseIssueKey(`${category} ${title}`) || null;

    const evidenceIds = [...new Set([...form.getAll("evidenceIds").map(String).filter(Boolean), ...(sourceType === "EVIDENCE" && rawId ? [rawId] : [])])];
    const evidenceCount = evidenceIds.length ? await db.evidence.count({ where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context) } }) : 0;
    if (evidenceCount !== evidenceIds.length) throw new Error("One or more linked evidence records could not be found.");
    const verifiedById = text(form, "verifiedById") || null;
    if (verifiedById && !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: verifiedById, status: "ACTIVE" } }))) throw new Error("Choose an active verifier.");
    const verificationDate = parseOptionalDate(form.get("verificationDate")), closureNote = text(form, "closureNote") || null;
    const managementResponse = text(form, "managementResponse") || null, completedActionSummary = text(form, "completedActionSummary") || null;
    const evidenceReviewedSummary = text(form, "evidenceReviewedSummary") || null, verificationRationale = text(form, "verificationRationale") || null;
    const checks = closureChecks(form), monitoringUntil = parseOptionalDate(form.get("monitoringUntil")), nextRecurrenceReviewDate = parseOptionalDate(form.get("nextRecurrenceReviewDate"));
    const escalationRequired = form.get("escalationRequired") === "true", escalationReason = text(form, "escalationReason") || null;
    if (escalationRequired && !escalationReason) throw new Error("Explain why this action needs escalation.");
    validateVerifiedClosure({ status, evidenceCount, managementResponse, completedActionSummary, evidenceReviewedSummary, ...checks, verificationRationale, closureNote, verifiedById, ownerId, priority, verificationDate });

    const candidates = await db.action.findMany({
      where: { ...actionScopeWhere(context), archivedAt: null },
      select: { id: true, reference: true, title: true, description: true, locationId: true, clientId: true, staffMemberId: true, category: true, issueKey: true, medicationIssueType: true, sourceType: true, sourceRecordId: true, status: true, lifecycleStatus: true, lastSeenAt: true, managementResponse: true },
      orderBy: { lastSeenAt: "desc" }, take: 250,
    });
    const suggestions = suggestActionMatches({ locationId, clientId, staffMemberId, category, issueKey, medicationIssueType, sourceType, sourceRecordId: rawId || null, title, description, occurredAt: source.occurredAt }, candidates);
    const matchDecision = text(form, "matchDecision");
    if (suggestions.length && !matchDecision) return NextResponse.json({ code: "POSSIBLE_MATCH", error: "A related action may already exist. Confirm the link or reject the match before creating another action.", matches: suggestions.map((match) => ({ ...match, ...candidates.find((item) => item.id === match.actionId) })) }, { status: 409 });

    if (matchDecision.startsWith("LINK:")) {
      const actionId = matchDecision.slice(5), match = suggestions.find((item) => item.actionId === actionId), existing = candidates.find((item) => item.id === actionId);
      if (!match || !existing) throw new Error("The selected match is no longer available. Review the current suggestions.");
      const recurrence = match.kind === "RECURRENCE";
      await db.$transaction(async (tx) => {
        const occurrence = occurrenceData({ organisationId: context.organisation.id, sourceType, rawId, source, locationId, clientId, staffMemberId, category, issueKey, medicationIssueType, description, actorId: context.user.id, decision: recurrence ? "RECURRENCE_CONFIRMED" : "LINK_CONFIRMED", score: match.score, rationale: match.rationale.join("; ") });
        if (rawId) await tx.actionOccurrence.upsert({ where: { actionId_sourceType_sourceRecordId: { actionId, sourceType: sourceType as never, sourceRecordId: rawId } }, update: { decision: occurrence.decision, matchScore: occurrence.matchScore, matchRationale: occurrence.matchRationale, decidedById: context.user.id, decidedAt: new Date() }, create: { ...occurrence, actionId } });
        else await tx.actionOccurrence.create({ data: { ...occurrence, actionId } });
        for (const evidenceId of evidenceIds) await tx.actionEvidence.upsert({ where: { actionId_evidenceId: { actionId, evidenceId } }, update: {}, create: { actionId, evidenceId } });
        const updatedStatus = recurrence ? "IN_PROGRESS" : existing.status, lifecycleStatus = recurrence ? "REOPENED_REPEAT_FINDING" : "LINKED_TO_EXISTING_ACTION";
        await tx.action.update({ where: { id: actionId }, data: { lastSeenAt: source.occurredAt, recurrenceCount: recurrence ? { increment: 1 } : undefined, status: updatedStatus as never, lifecycleStatus: lifecycleStatus as never } });
        await tx.actionUpdate.create({ data: { actionId, userId: context.user.id, note: `${recurrence ? "Repeat finding confirmed" : "Additional occurrence linked"}: ${source.reference ?? title}.`, status: updatedStatus as never } });
        await syncActionEvidence(tx, { actionId, organisationId: context.organisation.id, locationId: existing.locationId, reference: existing.reference, title: existing.title, description: existing.description, category: existing.category, sourceType: existing.sourceType, sourceReference: source.reference, ownerId, actorId: context.user.id, dueDate, reviewDate, status: updatedStatus, priority, progressPercent, expectedOutcome, successMeasure, archived: false });
        await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "ActionOccurrence", recordId: actionId, summary: `${recurrence ? "Confirmed recurrence against" : "Linked occurrence to"} action ${existing.reference}`, afterValue: { sourceType, sourceRecordId: rawId || null, matchScore: match.score, rationale: match.rationale } } });
      });
      return NextResponse.json({ id: actionId, linked: true });
    }

    const rejectedId = matchDecision.startsWith("REJECT:") ? matchDecision.slice(7) : null;
    const rejectedMatch = rejectedId ? suggestions.find((item) => item.actionId === rejectedId) : null;
    if (rejectedId && !rejectedMatch) throw new Error("The rejected match is no longer available. Review the current suggestions.");
    const lifecycleStatus = lifecycleForAction({ actionStatus: status, managementResponse, evidenceCount, verified: Boolean(verifiedById && verificationDate), monitoringUntil });
    const reference = text(form, "reference") || makeActionReference();
    const action = await db.$transaction(async (tx) => {
      const created = await tx.action.create({ data: { organisationId: context.organisation.id, locationId, clientId, staffMemberId, reference, title, description, category, rootCause: text(form, "rootCause") || null, expectedOutcome, successMeasure, sourceType: sourceType as never, sourceRecordId: rawId || null, sourceReference: source.reference, sourceUrl: source.url, lifecycleStatus: lifecycleStatus as never, issueKey, medicationIssueType: medicationIssueType as never, firstSeenAt: source.occurredAt, lastSeenAt: source.occurredAt, monitoringUntil, managementResponse, managementResponseById: managementResponse ? context.user.id : null, managementResponseAt: managementResponse ? new Date() : null, ownerId, priority: priority as never, dueDate, reviewDate, status: status as never, progressPercent, progressNote: text(form, "progressNote") || null, escalationRequired, escalationReason, evidenceRequired: true, evidenceWaiverExplanation: null, completionDate: parseOptionalDate(form.get("completionDate")), verifiedById, verificationDate, closureNote, completedActionSummary, evidenceReviewedSummary, ...checks, verificationRationale, nextRecurrenceReviewDate, createdById: context.user.id, evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) }, occurrences: { create: occurrenceData({ organisationId: context.organisation.id, sourceType, rawId, source, locationId, clientId, staffMemberId, category, issueKey, medicationIssueType, description, actorId: context.user.id, decision: rejectedMatch ? "MATCH_REJECTED" : "ORIGINAL", score: rejectedMatch?.score, rationale: rejectedMatch?.rationale.join("; ") }) } } });
      await tx.actionUpdate.create({ data: { actionId: created.id, userId: context.user.id, note: "Action created and connected to the improvement record.", status: created.status, progressPercent } });
      await syncActionEvidence(tx, { actionId: created.id, organisationId: created.organisationId, locationId, reference, title, description, category, sourceType, sourceReference: source.reference, ownerId, actorId: context.user.id, dueDate, reviewDate, status, priority, progressPercent, expectedOutcome, successMeasure, archived: false });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "Action", recordId: created.id, summary: `Created action: ${reference} — ${title}`, afterValue: { status, lifecycleStatus, priority, dueDate, sourceType, progressPercent, rejectedMatch: rejectedId } } });
      return created;
    });
    return NextResponse.json({ id: action.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create action." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

function occurrenceData(input: { organisationId: string; sourceType: string; rawId?: string; source: Awaited<ReturnType<typeof resolveActionSource>>; locationId: string | null; clientId: string | null; staffMemberId: string | null; category: string; issueKey: string | null; medicationIssueType: string | null; description: string; actorId: string; decision: string; score?: number; rationale?: string }) { return { organisationId: input.organisationId, locationId: input.locationId, clientId: input.clientId, staffMemberId: input.staffMemberId, sourceType: input.sourceType as never, sourceRecordId: input.rawId || null, sourceReference: input.source.reference, sourceUrl: input.source.url, occurredAt: input.source.occurredAt, category: input.category, issueKey: input.issueKey, medicationIssueType: input.medicationIssueType as never, narrative: input.description, decision: input.decision as never, matchScore: input.score ?? null, matchRationale: input.rationale ?? null, decidedById: input.decision === "ORIGINAL" ? null : input.actorId, decidedAt: input.decision === "ORIGINAL" ? null : new Date(), createdById: input.actorId }; }
function closureChecks(form: FormData) { return { immediateRiskControlled: optionalBoolean(form, "immediateRiskControlled"), underlyingRecordCorrected: optionalBoolean(form, "underlyingRecordCorrected"), staffSupportCompleted: optionalBoolean(form, "staffSupportCompleted"), widerRecordsChecked: optionalBoolean(form, "widerRecordsChecked"), recurrenceChecked: optionalBoolean(form, "recurrenceChecked") }; }
function optionalBoolean(form: FormData, key: string) { const value = form.get(key); return value === "true" ? true : value === "false" ? false : null; }
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function number(form: FormData, key: string, fallback: number) { const value = Number(form.get(key)); return Number.isFinite(value) ? Math.round(value) : fallback; }
