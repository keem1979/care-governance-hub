import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetingForm } from "@/components/meeting-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { meetingScopeWhere } from "@/lib/meetings";
import { PERMISSIONS } from "@/lib/permissions";

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), { id } = await params, db = createDb();
  try {
    const [meeting, memberships, evidence, actions] = await Promise.all([
      db.governanceMeeting.findFirst({ where: { id, ...meetingScopeWhere(context) }, include: { attendees: true, agendaItems: { orderBy: { sortOrder: "asc" } }, evidenceLinks: true } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
      db.action.findMany({ where: { organisationId: context.organisation.id, status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] } }, select: { id: true, reference: true, title: true }, orderBy: { dueDate: "asc" }, take: 100 }),
    ]);
    if (!meeting) notFound();
    return <main className="mx-auto max-w-6xl space-y-5"><div><Link href={`/meetings/${id}`} className="text-sm font-semibold text-emerald-700">← Back to meeting</Link><h1 className="mt-2 text-3xl font-bold">Update meeting record</h1><p className="mt-1 text-slate-600">Prepare the agenda, record the meeting and complete approval in one place.</p></div><MeetingForm members={memberships.map(({ user }) => user)} locations={context.locations.map(({ id: locationId, name }) => ({ id: locationId, name }))} evidence={evidence.map(({ id: evidenceId, title }) => ({ id: evidenceId, name: title }))} openActions={actions.map(({ id: actionId, reference, title }) => ({ id: actionId, name: `${reference} — ${title}` }))} initial={{ id: meeting.id, reference: meeting.reference, title: meeting.title, meetingType: meeting.meetingType, meetingDate: input(meeting.meetingDate), meetingTime: meeting.meetingTime, locationOrLink: meeting.locationOrLink, locationId: meeting.locationId ?? "", chairId: meeting.chairId, reportingPeriod: meeting.reportingPeriod ?? "", previousActionIds: meeting.previousActionIds, attendeeIds: meeting.attendees.filter((item) => item.attendance !== "APOLOGY").map(({ userId }) => userId), apologyIds: meeting.attendees.filter((item) => item.attendance === "APOLOGY").map(({ userId }) => userId), kpiReview: meeting.kpiReview ?? "", auditFindings: meeting.auditFindings ?? "", complaints: meeting.complaints ?? "", incidents: meeting.incidents ?? "", safeguarding: meeting.safeguarding ?? "", workforce: meeting.workforce ?? "", risks: meeting.risks ?? "", qualityImprovement: meeting.qualityImprovement ?? "", decisions: meeting.decisions ?? "", minutes: meeting.minutes ?? "", status: meeting.status === "ARCHIVED" ? "DRAFT" : meeting.status, approvedById: meeting.approvedById ?? "", approvalDate: input(meeting.approvalDate), nextMeetingDate: input(meeting.nextMeetingDate), evidenceIds: meeting.evidenceLinks.map(({ evidenceId }) => evidenceId), agenda: meeting.agendaItems.map((item) => ({ id: item.id, linkedActionId: item.linkedActionId ?? undefined, topic: item.topic, title: item.title, notes: item.notes ?? "", decision: item.decision ?? "" })) }} /></main>;
  } finally { await db.$disconnect(); }
}

function input(value: Date | null) { return value?.toISOString().slice(0, 10) ?? ""; }
