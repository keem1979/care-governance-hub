export const MEETING_TYPES = [
  "Monthly governance",
  "Quality and safety",
  "Medicines governance",
  "Health and safety",
  "Senior leadership",
  "Staff meeting",
  "Lessons learned",
  "Emergency review",
  "Board review",
] as const;

export const MEETING_STATUSES = ["DRAFT", "SCHEDULED", "IN_PROGRESS", "AWAITING_APPROVAL", "APPROVED", "CANCELLED", "ARCHIVED"] as const;

export const AGENDA_TOPICS = [
  "Previous actions",
  "People receiving care",
  "KPI review",
  "Audit findings",
  "Complaints",
  "Incidents",
  "Safeguarding",
  "Medicines",
  "Workforce",
  "Risks",
  "Quality improvement",
  "Regulatory updates",
  "Any other business",
] as const;

export type MeetingReadinessInput = {
  status: string;
  meetingDate: Date;
  attendeeCount: number;
  agendaCount: number;
  decisionCount: number;
  minutes: string | null;
  approvedById: string | null;
  approvalDate: Date | null;
};

export type MeetingReadinessCheck = { key: string; label: string; complete: boolean };

export function meetingLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function makeMeetingReference(now = new Date(), random = Math.floor(Math.random() * 1000)) {
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `MTG-${date}-${String(random).padStart(3, "0")}`;
}

export function meetingScopeWhere(context: { organisation: { id: string }; allLocations: boolean; locations: { id: string }[] }) {
  return { organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id }) => id) } }] }) };
}

export function validateMeetingApproval(input: { status: string; approvedById?: string; approvalDate?: Date | null; minutes?: string }) {
  if (input.status !== "APPROVED") return;
  if (!input.minutes?.trim()) throw new Error("Approved meetings require completed minutes.");
  if (!input.approvedById || !input.approvalDate) throw new Error("Approved meetings require a named approver and approval date.");
}

export function collectAgenda(form: FormData) {
  const ids = form.getAll("agendaItemId").map(String);
  const linkedActionIds = form.getAll("agendaLinkedActionId").map(String);
  const titles = form.getAll("agendaTitle").map(String);
  const topics = form.getAll("agendaTopic").map(String);
  const notes = form.getAll("agendaNotes").map(String);
  const decisions = form.getAll("agendaDecision").map(String);
  return titles
    .map((title, index) => ({ id: ids[index] || undefined, linkedActionId: linkedActionIds[index] || null, title: title.trim(), topic: topics[index] || "Any other business", notes: notes[index]?.trim() || null, decision: decisions[index]?.trim() || null, sortOrder: index + 1 }))
    .filter((item) => item.title.length >= 2);
}

export function meetingReadiness(input: MeetingReadinessInput) {
  const checks: MeetingReadinessCheck[] = [
    { key: "attendance", label: "Attendance recorded", complete: input.attendeeCount > 0 },
    { key: "agenda", label: "Agenda prepared", complete: input.agendaCount > 0 },
    { key: "decisions", label: "Decisions recorded", complete: input.decisionCount > 0 },
    { key: "minutes", label: "Minutes completed", complete: Boolean(input.minutes?.trim()) },
    { key: "approval", label: "Minutes approved", complete: Boolean(input.approvedById && input.approvalDate && input.status === "APPROVED") },
  ];
  return { checks, completed: checks.filter((check) => check.complete).length, total: checks.length, percent: Math.round((checks.filter((check) => check.complete).length / checks.length) * 100) };
}

export function meetingAttention(input: MeetingReadinessInput, now = new Date()): string | null {
  if (["APPROVED", "CANCELLED", "ARCHIVED"].includes(input.status)) return null;
  if (input.meetingDate.getTime() > now.getTime()) return input.agendaCount ? null : "Agenda needed";
  if (!input.minutes?.trim()) return "Minutes need completing";
  if (!input.approvedById || !input.approvalDate || input.status !== "APPROVED") return "Minutes need approval";
  return null;
}

export function meetingCurrentWork(input: MeetingReadinessInput, now = new Date()) {
  if (input.status === "ARCHIVED" || input.status === "CANCELLED") {
    return { title: "No current work", description: `This meeting is ${meetingLabel(input.status).toLowerCase()}.`, action: null, target: null };
  }
  if (input.status === "APPROVED") {
    return { title: "Approved minutes available", description: "Read the recorded decisions, actions and approved minutes below.", action: "Read minutes", target: "minutes-record" };
  }
  if (input.meetingDate.getTime() > now.getTime()) {
    return input.agendaCount === 0
      ? { title: "Prepare the agenda", description: "Add the subjects to review before the meeting.", action: "Edit agenda", target: "agenda" }
      : { title: "Agenda prepared", description: "Review the agenda and bring forward relevant actions before the meeting.", action: "Review agenda", target: "agenda" };
  }
  if (!input.minutes?.trim()) {
    return { title: "Complete the minutes", description: "Record the discussion and decisions before seeking approval.", action: "Write minutes", target: "minutes" };
  }
  return { title: "Review the minutes for approval", description: "An authorised editor must review the minutes and choose Approved. The system records their account and approval date.", action: "Review approval decision", target: "approval" };
}
