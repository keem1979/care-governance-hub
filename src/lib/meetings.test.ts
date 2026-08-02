import { describe, expect, it } from "vitest";
import { collectAgenda, makeMeetingReference, meetingAttention, meetingReadiness, validateMeetingApproval } from "@/lib/meetings";

const base = { status: "IN_PROGRESS", meetingDate: new Date("2026-07-25T10:00:00Z"), attendeeCount: 2, agendaCount: 2, decisionCount: 1, minutes: "Minutes", approvedById: null, approvalDate: null };

describe("governance meetings", () => {
  it("creates readable references", () => expect(makeMeetingReference(new Date("2026-07-25T00:00:00Z"), 8)).toBe("MTG-20260725-008"));
  it("collects ordered agenda items", () => { const form = new FormData(); form.append("agendaTitle", "Review risks"); form.append("agendaTopic", "Risks"); form.append("agendaNotes", "Top risks"); form.append("agendaDecision", "Escalate"); expect(collectAgenda(form)).toEqual([{ id: undefined, linkedActionId: null, title: "Review risks", topic: "Risks", notes: "Top risks", decision: "Escalate", sortOrder: 1 }]); });
  it("guards approval", () => expect(() => validateMeetingApproval({ status: "APPROVED", minutes: "Done" })).toThrow(/approver/));
  it("allows approved minutes", () => expect(() => validateMeetingApproval({ status: "APPROVED", minutes: "Minutes", approvedById: "user", approvalDate: new Date() })).not.toThrow());
  it("shows a five-part readiness checklist", () => expect(meetingReadiness(base)).toMatchObject({ completed: 4, total: 5, percent: 80 }));
  it("identifies missing minutes after a meeting", () => expect(meetingAttention({ ...base, minutes: null }, new Date("2026-07-26T10:00:00Z"))).toBe("Minutes need completing"));
  it("identifies missing agendas before a meeting", () => expect(meetingAttention({ ...base, meetingDate: new Date("2026-07-27T10:00:00Z"), agendaCount: 0 }, new Date("2026-07-26T10:00:00Z"))).toBe("Agenda needed"));
});
