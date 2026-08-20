import type { Prisma } from "@/generated/prisma/client";
import { meetingLabel } from "@/lib/meetings";

export type MeetingEvidenceInput = {
  meetingId: string;
  organisationId: string;
  locationId: string | null;
  reference: string;
  title: string;
  meetingType: string;
  meetingDate: Date;
  chairId: string;
  actorId: string;
  nextMeetingDate: Date | null;
  status: string;
  minutes: string | null;
  decisionCount: number;
  actionCount: number;
  archived: boolean;
};

export async function syncMeetingEvidence(tx: Prisma.TransactionClient, input: MeetingEvidenceInput) {
  const existing = await tx.evidence.findFirst({ where: { organisationId: input.organisationId, relatedModule: "GovernanceMeeting", relatedRecordId: input.meetingId }, select: { id: true } });
  const approved = input.status === "APPROVED";
  const data = {
    organisationId: input.organisationId,
    locationId: input.locationId,
    title: `Governance meeting: ${input.reference} — ${input.title}`.slice(0, 180),
    description: `${input.meetingType}. ${approved ? "Approved meeting record" : "Live meeting record"} with ${input.decisionCount} recorded decision${input.decisionCount === 1 ? "" : "s"} and ${input.actionCount} linked action${input.actionCount === 1 ? "" : "s"}.`,
    category: "Governance meetings",
    evidenceType: approved ? "Approved meeting minutes" : "Meeting record",
    sourceType: "INTERNAL_RECORD" as const,
    sourceName: "Governance Meetings",
    sourceReference: input.reference,
    ownerId: input.chairId,
    evidenceDate: input.meetingDate,
    reviewExpiryDate: input.nextMeetingDate,
    tags: ["system-generated", "governance-meeting", "requirement:well-governance-minutes", "evidence-category:staff-and-leader-feedback", input.reference.toLowerCase(), `meeting-status:${input.status.toLowerCase()}`],
    relatedModule: "GovernanceMeeting",
    relatedRecordId: input.meetingId,
    confidentiality: "CONFIDENTIAL" as const,
    status: input.archived ? "ARCHIVED" as const : "ACTIVE" as const,
    archivedAt: input.archived ? new Date() : null,
    notes: `Kept in sync with the Governance Meetings record. Status: ${meetingLabel(input.status)}. Open the source meeting for attendance, agenda, decisions, actions, minutes and approval.`,
  };
  const evidence = existing
    ? await tx.evidence.update({ where: { id: existing.id }, data })
    : await tx.evidence.create({ data: { ...data, uploadedById: input.actorId } });
  await tx.meetingEvidence.upsert({ where: { meetingId_evidenceId: { meetingId: input.meetingId, evidenceId: evidence.id } }, create: { meetingId: input.meetingId, evidenceId: evidence.id }, update: {} });
  return evidence;
}
