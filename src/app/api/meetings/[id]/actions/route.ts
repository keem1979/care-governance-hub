import { NextResponse } from "next/server";
import { syncActionEvidence } from "@/lib/action-evidence";
import { ACTION_PRIORITIES, makeActionReference } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { syncMeetingEvidence } from "@/lib/meeting-evidence";
import { meetingScopeWhere } from "@/lib/meetings";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE);
  const { id } = await params;
  const form = await request.formData();
  const db = createDb();
  try {
    const meeting = await db.governanceMeeting.findFirst({ where: { id, ...meetingScopeWhere(context) }, include: { agendaItems: { select: { decision: true } } } });
    if (!meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    const agendaId = text(form, "agendaId"), agenda = await db.meetingAgendaItem.findFirst({ where: { id: agendaId, meetingId: id } });
    if (!agenda) throw new Error("Agenda item not found.");
    if (agenda.linkedActionId) throw new Error("This agenda item already has an action.");
    const title = text(form, "title"), ownerId = text(form, "ownerId"), priority = text(form, "priority") || "MEDIUM", dueDate = parseOptionalDate(form.get("dueDate"));
    const expectedOutcome = text(form, "expectedOutcome"), successMeasure = text(form, "successMeasure");
    if (title.length < 3 || !ownerId || !dueDate) throw new Error("Enter the action, owner and due date.");
    if (!expectedOutcome || !successMeasure) throw new Error("Add the expected outcome and how success will be checked.");
    if (!ACTION_PRIORITIES.includes(priority as never) || !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose valid action values.");
    const reference = makeActionReference(), description = agenda.notes ?? agenda.title;
    const action = await db.$transaction(async (tx) => {
      const created = await tx.action.create({ data: { organisationId: context.organisation.id, locationId: meeting.locationId, reference, title, description, category: "Governance", expectedOutcome, successMeasure, sourceType: "GOVERNANCE_MEETING", sourceRecordId: id, sourceReference: meeting.reference, sourceUrl: `/meetings/${id}`, ownerId, priority: priority as never, dueDate, createdById: context.user.id } });
      await tx.meetingAgendaItem.update({ where: { id: agendaId }, data: { linkedActionId: created.id } });
      await tx.actionUpdate.create({ data: { actionId: created.id, userId: context.user.id, note: `Agreed at ${meeting.reference}: ${agenda.title}`, status: "OPEN", progressPercent: 0 } });
      await syncActionEvidence(tx, { actionId: created.id, organisationId: created.organisationId, locationId: meeting.locationId, reference, title, description, category: "Governance", sourceType: "GOVERNANCE_MEETING", sourceReference: meeting.reference, ownerId, actorId: context.user.id, dueDate, reviewDate: null, status: "OPEN", priority, progressPercent: 0, expectedOutcome, successMeasure, archived: false });
      await syncMeetingEvidence(tx, { meetingId: id, organisationId: meeting.organisationId, locationId: meeting.locationId, reference: meeting.reference, title: meeting.title, meetingType: meeting.meetingType, meetingDate: meeting.meetingDate, chairId: meeting.chairId, actorId: context.user.id, nextMeetingDate: meeting.nextMeetingDate, status: meeting.status, minutes: meeting.minutes, decisionCount: meeting.agendaItems.filter((item) => item.decision).length, actionCount: 1 + await tx.action.count({ where: { organisationId: meeting.organisationId, sourceType: "GOVERNANCE_MEETING", sourceRecordId: id, id: { not: created.id } } }), archived: meeting.status === "ARCHIVED" });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: meeting.locationId, userId: context.user.id, action: "CREATE", recordType: "Action", recordId: created.id, summary: `Created action from meeting: ${reference} — ${title}` } });
      return created;
    });
    return NextResponse.json({ id: action.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create action." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
