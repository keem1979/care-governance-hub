import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { syncMeetingEvidence } from "@/lib/meeting-evidence";
import { collectAgenda, makeMeetingReference, MEETING_STATUSES, MEETING_TYPES, validateMeetingApproval } from "@/lib/meetings";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), form = await request.formData(), db = createDb();
  try {
    const title = text(form, "title"), meetingType = text(form, "meetingType"), meetingDate = parseOptionalDate(form.get("meetingDate")), meetingTime = text(form, "meetingTime"), locationOrLink = text(form, "locationOrLink");
    const locationId = text(form, "locationId") || null, chairId = text(form, "chairId"), status = text(form, "status") || "DRAFT", minutes = text(form, "minutes") || null;
    const approvedById = text(form, "approvedById") || null, approvalDate = parseOptionalDate(form.get("approvalDate")), nextMeetingDate = parseOptionalDate(form.get("nextMeetingDate"));
    if (title.length < 3 || !meetingDate || !meetingTime || locationOrLink.length < 2) throw new Error("Enter the meeting title, date, time and location or link.");
    if (!MEETING_TYPES.includes(meetingType as never) || !MEETING_STATUSES.filter((item) => item !== "ARCHIVED").includes(status as never)) throw new Error("Choose valid meeting values.");
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");

    const attendeeIds = form.getAll("attendeeIds").map(String), apologyIds = form.getAll("apologyIds").map(String).filter((id) => !attendeeIds.includes(id));
    const people = [chairId, ...attendeeIds, ...apologyIds, ...(approvedById ? [approvedById] : [])];
    for (const userId of people) if (!userId || !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId, status: "ACTIVE" } }))) throw new Error("Choose active organisation members.");

    const evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    for (const evidenceId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence could not be found.");
    const previousActionIds = form.getAll("previousActionIds").map(String);
    for (const actionId of previousActionIds) if (!(await db.action.findFirst({ where: { id: actionId, organisationId: context.organisation.id, status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] } } }))) throw new Error("A previous action is not available.");
    validateMeetingApproval({ status, approvedById: approvedById ?? undefined, approvalDate, minutes: minutes ?? undefined });

    const agenda = collectAgenda(form).map(({ title: agendaTitle, topic, notes, decision, sortOrder }) => ({ title: agendaTitle, topic, notes, decision, sortOrder }));
    if (!agenda.length) throw new Error("Add at least one agenda item.");
    const reference = text(form, "reference") || makeMeetingReference();
    const meeting = await db.$transaction(async (tx) => {
      const created = await tx.governanceMeeting.create({ data: { organisationId: context.organisation.id, locationId, reference, title, meetingType, meetingDate, meetingTime, locationOrLink, chairId, reportingPeriod: text(form, "reportingPeriod") || null, previousActionIds, kpiReview: text(form, "kpiReview") || null, auditFindings: text(form, "auditFindings") || null, complaints: text(form, "complaints") || null, incidents: text(form, "incidents") || null, safeguarding: text(form, "safeguarding") || null, workforce: text(form, "workforce") || null, risks: text(form, "risks") || null, qualityImprovement: text(form, "qualityImprovement") || null, decisions: text(form, "decisions") || null, minutes, status: status as never, approvedById, approvalDate, nextMeetingDate, createdById: context.user.id, attendees: { create: [...attendeeIds.map((userId) => ({ userId, attendance: "ATTENDING" as const })), ...apologyIds.map((userId) => ({ userId, attendance: "APOLOGY" as const }))] }, agendaItems: { create: agenda }, evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      await syncMeetingEvidence(tx, { meetingId: created.id, organisationId: created.organisationId, locationId, reference, title, meetingType, meetingDate, chairId, actorId: context.user.id, nextMeetingDate, status, minutes, decisionCount: agenda.filter((item) => item.decision).length, actionCount: 0, archived: false });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "GovernanceMeeting", recordId: created.id, summary: `Created governance meeting: ${reference} — ${title}`, afterValue: { meetingType, meetingDate, status } } });
      return created;
    });
    return NextResponse.json({ id: meeting.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create meeting." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

function text(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
