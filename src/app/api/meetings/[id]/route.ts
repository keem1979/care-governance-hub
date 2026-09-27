import { NextResponse } from "next/server";
import { actionScopeWhere } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { syncMeetingEvidence } from "@/lib/meeting-evidence";
import { collectAgenda, meetingScopeWhere, MEETING_STATUSES, MEETING_TYPES, validateMeetingApproval } from "@/lib/meetings";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const db = createDb();
  try {
    const meeting = await db.governanceMeeting.findFirst({ where: { id, ...meetingScopeWhere(context) }, include: { agendaItems: { select: { id: true, title: true, notes: true, decision: true, linkedActionId: true, controlledDecision: { select: { id: true } } } }, evidenceLinks: { select: { evidenceId: true } } } });
    if (!meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    if (!context.allLocations && (!meeting.locationId || !context.locations.some(({ id: authorisedId }) => authorisedId === meeting.locationId))) throw new Error("This meeting is outside your authorised editing locations.");

    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json() as { intent?: string };
      if (!["archive", "restore"].includes(body.intent ?? "")) throw new Error("Unknown meeting action.");
      const archive = body.intent === "archive";
      if (archive && meeting.status === "ARCHIVED") throw new Error("This meeting is already archived.");
      if (!archive && meeting.status !== "ARCHIVED") throw new Error("Only an archived meeting can be restored.");
      if (meeting.agendaItems.some(({ controlledDecision }) => controlledDecision)) throw new Error("A meeting with controlled decisions cannot be archived or restored until a governed correction route is available.");
      await db.$transaction(async (tx) => {
        const status = archive ? "ARCHIVED" : "DRAFT";
        await tx.governanceMeeting.update({ where: { id }, data: { status, archivedAt: archive ? new Date() : null, ...(!archive ? { approvedById: null, approvalDate: null } : {}) } });
        const actionCount = await tx.action.count({ where: { organisationId: meeting.organisationId, sourceType: "GOVERNANCE_MEETING", sourceRecordId: id } });
        await syncMeetingEvidence(tx, { meetingId: id, organisationId: meeting.organisationId, locationId: meeting.locationId, reference: meeting.reference, title: meeting.title, meetingType: meeting.meetingType, meetingDate: meeting.meetingDate, chairId: meeting.chairId, actorId: context.user.id, nextMeetingDate: meeting.nextMeetingDate, status, minutes: meeting.minutes, decisionCount: meeting.agendaItems.filter(({ decision }) => decision?.trim()).length, actionCount, archived: archive });
        await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: meeting.locationId, userId: context.user.id, action: archive ? "ARCHIVE" : "RESTORE", recordType: "GovernanceMeeting", recordId: id, summary: `${archive ? "Archived" : "Restored"} meeting: ${meeting.reference}`, beforeValue: { status: meeting.status, approvedById: meeting.approvedById, approvalDate: meeting.approvalDate, minutes: meeting.minutes, agenda: meeting.agendaItems.map(({ id: agendaId, title: agendaTitle, notes, decision }) => ({ id: agendaId, title: agendaTitle, notes, decision })) }, afterValue: { status, approvedById: archive ? meeting.approvedById : null, approvalDate: archive ? meeting.approvalDate : null } } });
      });
      return NextResponse.json({ ok: true });
    }

    if (meeting.status === "ARCHIVED") throw new Error("Restore the meeting before editing it.");
    if (meeting.status === "APPROVED") throw new Error("Approved minutes cannot be edited. Archive and restore the meeting before changing its record.");

    const form = await request.formData();
    const title = text(form, "title"), meetingType = text(form, "meetingType"), meetingDate = parseOptionalDate(form.get("meetingDate"));
    const meetingTime = text(form, "meetingTime"), locationOrLink = text(form, "locationOrLink"), locationId = text(form, "locationId") || null;
    const chairId = text(form, "chairId"), status = text(form, "status") || "DRAFT", minutes = text(form, "minutes") || null;
    const suppliedApproverId = text(form, "approvedById"), suppliedApprovalDate = text(form, "approvalDate"), nextMeetingDate = parseOptionalDate(form.get("nextMeetingDate"));
    if (title.length < 3 || !meetingDate || !meetingTime || locationOrLink.length < 2) throw new Error("Enter the meeting title, date, time and location or link.");
    if (!MEETING_TYPES.includes(meetingType as never) || !MEETING_STATUSES.filter((item) => item !== "ARCHIVED").includes(status as never)) throw new Error("Choose valid meeting values.");
    if (locationId && !context.locations.some(({ id: location }) => location === locationId)) throw new Error("Choose an authorised location.");
    if (!context.allLocations && !locationId) throw new Error("This meeting is outside your authorised editing locations.");
    if (suppliedApproverId && suppliedApproverId !== context.user.id) throw new Error("You cannot record approval on behalf of another person.");
    if (suppliedApprovalDate) throw new Error("Approval date is recorded automatically when you approve the minutes.");
    if (status !== "APPROVED" && suppliedApproverId) throw new Error("Approval details require an explicit Approved decision.");
    const approvedById = status === "APPROVED" ? context.user.id : null;
    const approvalDate = status === "APPROVED" ? new Date() : null;

    const attendeeIds = form.getAll("attendeeIds").map(String), apologyIds = form.getAll("apologyIds").map(String).filter((userId) => !attendeeIds.includes(userId));
    const people = [chairId, ...attendeeIds, ...apologyIds];
    for (const userId of people) if (!userId || !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId, status: "ACTIVE" } }))) throw new Error("Choose active organisation members.");

    const requestedEvidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    for (const evidenceId of requestedEvidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const requestedActionIds = [...new Set(form.getAll("previousActionIds").map(String).filter(Boolean))];
    for (const actionId of requestedActionIds) if (!(await db.action.findFirst({ where: { id: actionId, ...actionScopeWhere(context) } }))) throw new Error("A previous action is not available.");
    const authorisedLocationIds = new Set(context.locations.map(({ id: authorisedId }) => authorisedId));
    const [existingActions, existingEvidence] = context.allLocations ? [[], []] : await Promise.all([
      db.action.findMany({ where: { id: { in: meeting.previousActionIds }, organisationId: context.organisation.id }, select: { id: true, locationId: true } }),
      db.evidence.findMany({ where: { id: { in: meeting.evidenceLinks.map(({ evidenceId }) => evidenceId) }, organisationId: context.organisation.id }, select: { id: true, locationId: true } }),
    ]);
    const previousActionIds = [...new Set([...requestedActionIds, ...existingActions.filter(({ locationId: actionLocationId }) => actionLocationId && !authorisedLocationIds.has(actionLocationId)).map(({ id: actionId }) => actionId)])];
    const evidenceIds = [...new Set([...requestedEvidenceIds, ...existingEvidence.filter(({ locationId: evidenceLocationId }) => evidenceLocationId && !authorisedLocationIds.has(evidenceLocationId)).map(({ id: evidenceId }) => evidenceId)])];
    validateMeetingApproval({ status, approvedById: approvedById ?? undefined, approvalDate, minutes: minutes ?? undefined });

    const agenda = collectAgenda(form);
    if (!agenda.length) throw new Error("Add at least one agenda item.");
    const allowedAgenda = new Map(meeting.agendaItems.map((item) => [item.id, item.linkedActionId]));
    const submittedAgendaIds = agenda.map(({ id: agendaId }) => agendaId).filter((agendaId): agendaId is string => Boolean(agendaId));
    if (new Set(submittedAgendaIds).size !== submittedAgendaIds.length) throw new Error("An agenda item was submitted more than once.");
    const retainedAgendaIds = new Set(submittedAgendaIds);
    for (const item of meeting.agendaItems) {
      if (!retainedAgendaIds.has(item.id) && (item.linkedActionId || item.controlledDecision)) throw new Error("An agenda item linked to an Action or controlled decision cannot be removed.");
    }
    for (const item of agenda) {
      if (item.id && !allowedAgenda.has(item.id)) throw new Error("An agenda item could not be verified.");
      if (item.linkedActionId && allowedAgenda.get(item.id ?? "") !== item.linkedActionId) throw new Error("A linked action could not be verified.");
    }

    await db.$transaction(async (tx) => {
      await tx.governanceMeeting.update({ where: { id }, data: { locationId, title, meetingType, meetingDate, meetingTime, locationOrLink, chairId, reportingPeriod: text(form, "reportingPeriod") || null, previousActionIds, kpiReview: text(form, "kpiReview") || null, auditFindings: text(form, "auditFindings") || null, complaints: text(form, "complaints") || null, incidents: text(form, "incidents") || null, safeguarding: text(form, "safeguarding") || null, workforce: text(form, "workforce") || null, risks: text(form, "risks") || null, qualityImprovement: text(form, "qualityImprovement") || null, decisions: text(form, "decisions") || null, minutes, status: status as never, approvedById, approvalDate, nextMeetingDate, attendees: { deleteMany: {}, create: [...attendeeIds.map((userId) => ({ userId, attendance: "ATTENDING" as const })), ...apologyIds.map((userId) => ({ userId, attendance: "APOLOGY" as const }))] }, evidenceLinks: { deleteMany: {}, create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      for (const [index, item] of meeting.agendaItems.entries()) await tx.meetingAgendaItem.update({ where: { id: item.id }, data: { sortOrder: -1_000_000 - index } });
      const removedAgendaIds = meeting.agendaItems.filter(({ id: agendaId }) => !retainedAgendaIds.has(agendaId)).map(({ id: agendaId }) => agendaId);
      if (removedAgendaIds.length) await tx.meetingAgendaItem.deleteMany({ where: { meetingId: id, id: { in: removedAgendaIds } } });
      for (const item of agenda) {
        const data = { topic: item.topic, title: item.title, notes: item.notes, decision: item.decision, sortOrder: item.sortOrder };
        if (item.id) await tx.meetingAgendaItem.update({ where: { id: item.id }, data });
        else await tx.meetingAgendaItem.create({ data: { meetingId: id, ...data } });
      }
      const actionCount = await tx.action.count({ where: { organisationId: meeting.organisationId, sourceType: "GOVERNANCE_MEETING", sourceRecordId: id } });
      await syncMeetingEvidence(tx, { meetingId: id, organisationId: meeting.organisationId, locationId, reference: meeting.reference, title, meetingType, meetingDate, chairId, actorId: context.user.id, nextMeetingDate, status, minutes, decisionCount: agenda.filter((item) => item.decision).length, actionCount, archived: false });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: status === "APPROVED" ? "APPROVAL" : "UPDATE", recordType: "GovernanceMeeting", recordId: id, summary: `${status === "APPROVED" ? "Approved minutes for" : "Updated"} governance meeting: ${meeting.reference}`, beforeValue: { status: meeting.status }, afterValue: { status, meetingDate, approvedById, approvalDate } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update meeting." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

function text(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
