import { NextResponse } from "next/server";
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
    const meeting = await db.governanceMeeting.findFirst({ where: { id, ...meetingScopeWhere(context) }, include: { agendaItems: { select: { id: true, linkedActionId: true } } } });
    if (!meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });

    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json() as { intent?: string };
      if (!["archive", "restore"].includes(body.intent ?? "")) throw new Error("Unknown meeting action.");
      const archive = body.intent === "archive";
      await db.$transaction(async (tx) => {
        const status = archive ? "ARCHIVED" : "DRAFT";
        await tx.governanceMeeting.update({ where: { id }, data: { status, archivedAt: archive ? new Date() : null } });
        const actionCount = await tx.action.count({ where: { organisationId: meeting.organisationId, sourceType: "GOVERNANCE_MEETING", sourceRecordId: id } });
        await syncMeetingEvidence(tx, { meetingId: id, organisationId: meeting.organisationId, locationId: meeting.locationId, reference: meeting.reference, title: meeting.title, meetingType: meeting.meetingType, meetingDate: meeting.meetingDate, chairId: meeting.chairId, actorId: context.user.id, nextMeetingDate: meeting.nextMeetingDate, status, minutes: meeting.minutes, decisionCount: 0, actionCount, archived: archive });
        await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: meeting.locationId, userId: context.user.id, action: archive ? "ARCHIVE" : "RESTORE", recordType: "GovernanceMeeting", recordId: id, summary: `${archive ? "Archived" : "Restored"} meeting: ${meeting.reference}` } });
      });
      return NextResponse.json({ ok: true });
    }

    const form = await request.formData();
    const title = text(form, "title"), meetingType = text(form, "meetingType"), meetingDate = parseOptionalDate(form.get("meetingDate"));
    const meetingTime = text(form, "meetingTime"), locationOrLink = text(form, "locationOrLink"), locationId = text(form, "locationId") || null;
    const chairId = text(form, "chairId"), status = text(form, "status") || "DRAFT", minutes = text(form, "minutes") || null;
    const approvedById = text(form, "approvedById") || null, approvalDate = parseOptionalDate(form.get("approvalDate")), nextMeetingDate = parseOptionalDate(form.get("nextMeetingDate"));
    if (title.length < 3 || !meetingDate || !meetingTime || locationOrLink.length < 2) throw new Error("Enter the meeting title, date, time and location or link.");
    if (!MEETING_TYPES.includes(meetingType as never) || !MEETING_STATUSES.filter((item) => item !== "ARCHIVED").includes(status as never)) throw new Error("Choose valid meeting values.");
    if (locationId && !context.locations.some(({ id: location }) => location === locationId)) throw new Error("Choose an authorised location.");

    const attendeeIds = form.getAll("attendeeIds").map(String), apologyIds = form.getAll("apologyIds").map(String).filter((userId) => !attendeeIds.includes(userId));
    const people = [chairId, ...attendeeIds, ...apologyIds, ...(approvedById ? [approvedById] : [])];
    for (const userId of people) if (!userId || !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId, status: "ACTIVE" } }))) throw new Error("Choose active organisation members.");

    const evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    for (const evidenceId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const previousActionIds = form.getAll("previousActionIds").map(String);
    for (const actionId of previousActionIds) if (!(await db.action.findFirst({ where: { id: actionId, organisationId: context.organisation.id } }))) throw new Error("A previous action is not available.");
    validateMeetingApproval({ status, approvedById: approvedById ?? undefined, approvalDate, minutes: minutes ?? undefined });

    const agenda = collectAgenda(form);
    if (!agenda.length) throw new Error("Add at least one agenda item.");
    const allowedAgenda = new Map(meeting.agendaItems.map((item) => [item.id, item.linkedActionId]));
    for (const item of agenda) {
      if (item.id && !allowedAgenda.has(item.id)) throw new Error("An agenda item could not be verified.");
      if (item.linkedActionId && allowedAgenda.get(item.id ?? "") !== item.linkedActionId) throw new Error("A linked action could not be verified.");
    }

    await db.$transaction(async (tx) => {
      await tx.governanceMeeting.update({ where: { id }, data: { locationId, title, meetingType, meetingDate, meetingTime, locationOrLink, chairId, reportingPeriod: text(form, "reportingPeriod") || null, previousActionIds, kpiReview: text(form, "kpiReview") || null, auditFindings: text(form, "auditFindings") || null, complaints: text(form, "complaints") || null, incidents: text(form, "incidents") || null, safeguarding: text(form, "safeguarding") || null, workforce: text(form, "workforce") || null, risks: text(form, "risks") || null, qualityImprovement: text(form, "qualityImprovement") || null, decisions: text(form, "decisions") || null, minutes, status: status as never, approvedById, approvalDate, nextMeetingDate, attendees: { deleteMany: {}, create: [...attendeeIds.map((userId) => ({ userId, attendance: "ATTENDING" as const })), ...apologyIds.map((userId) => ({ userId, attendance: "APOLOGY" as const }))] }, agendaItems: { deleteMany: {}, create: agenda }, evidenceLinks: { deleteMany: {}, create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      const actionCount = await tx.action.count({ where: { organisationId: meeting.organisationId, sourceType: "GOVERNANCE_MEETING", sourceRecordId: id } });
      await syncMeetingEvidence(tx, { meetingId: id, organisationId: meeting.organisationId, locationId, reference: meeting.reference, title, meetingType, meetingDate, chairId, actorId: context.user.id, nextMeetingDate, status, minutes, decisionCount: agenda.filter((item) => item.decision).length, actionCount, archived: false });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "GovernanceMeeting", recordId: id, summary: `Updated governance meeting: ${meeting.reference}`, beforeValue: { status: meeting.status }, afterValue: { status, meetingDate } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update meeting." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

function text(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
