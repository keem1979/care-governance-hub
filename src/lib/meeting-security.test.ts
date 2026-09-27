import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { POST as createMeeting } from "@/app/api/meetings/route";
import { PATCH as updateMeeting } from "@/app/api/meetings/[id]/route";
import { POST as extractAction } from "@/app/api/meetings/[id]/actions/route";
import AgendaPage from "@/app/(app)/meetings/[id]/agenda/page";
import MinutesPage from "@/app/(app)/meetings/[id]/minutes/page";

vi.mock("@/lib/auth/dal", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/db", () => ({ createDb: vi.fn() }));
vi.mock("@/lib/meeting-evidence", () => ({ syncMeetingEvidence: vi.fn() }));
vi.mock("@/lib/action-evidence", () => ({ syncActionEvidence: vi.fn() }));

const meetingId = "meeting-1";
const context = {
  user: { id: "manager-1" },
  organisation: { id: "organisation-1", name: "Fictional Care" },
  allLocations: false,
  locations: [{ id: "branch-a" }],
  permissions: ["governance:view", "governance:edit", "actions:manage", "reports:export"],
};

function testDb() {
  return {
    governanceMeeting: { findFirst: vi.fn() },
    organisationMembership: { findFirst: vi.fn().mockResolvedValue({ id: "membership-1" }) },
    evidence: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    action: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    meetingAgendaItem: { findFirst: vi.fn() },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  };
}

let db: ReturnType<typeof testDb>;

function meetingForm() {
  const form = new FormData();
  form.set("title", "Monthly governance");
  form.set("meetingType", "Monthly governance");
  form.set("meetingDate", "2026-09-28");
  form.set("meetingTime", "10:00");
  form.set("locationOrLink", "Meeting room");
  form.set("locationId", "branch-a");
  form.set("chairId", "manager-1");
  form.set("agendaTitle", "Review current work");
  return form;
}

function request(path: string, form: FormData) {
  return new Request(`http://localhost${path}`, { method: "POST", body: form });
}

function routeParams() {
  return { params: Promise.resolve({ id: meetingId }) };
}

function printableMeeting() {
  return {
    title: "Fictional monthly meeting",
    meetingType: "Monthly governance",
    meetingDate: new Date("2026-09-28T10:00:00.000Z"),
    meetingTime: "10:00",
    locationOrLink: "Meeting room",
    chair: { name: "Fictional chair" },
    attendees: [],
    agendaItems: [],
    previousActionIds: [],
    approvedBy: null,
    minutes: null,
    status: "DRAFT",
    approvalDate: null,
  };
}

function editableMeeting(overrides: Record<string, unknown> = {}) {
  return {
    ...printableMeeting(),
    id: meetingId,
    organisationId: context.organisation.id,
    locationId: "branch-a",
    reference: "MTG-TEST",
    chairId: "manager-1",
    approvedById: null,
    nextMeetingDate: null,
    evidenceLinks: [],
    ...overrides,
  };
}

function mockTransaction() {
  const tx = {
    governanceMeeting: { update: vi.fn() },
    meetingAgendaItem: { update: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    action: { count: vi.fn().mockResolvedValue(0) },
    activityLog: { create: vi.fn() },
  };
  db.$transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
  db = testDb();
  vi.mocked(createDb).mockReturnValue(db as never);
  vi.mocked(requirePermission).mockResolvedValue(context as never);
});

describe("governance meeting location and lifecycle security", () => {
  it("rejects organisation-wide meeting creation by a location-limited manager", async () => {
    const form = meetingForm();
    form.set("locationId", "");
    const response = await createMeeting(request("/api/meetings", form));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/outside your authorised editing locations/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects moving a branch meeting to organisation-wide scope", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting());
    const form = meetingForm();
    form.set("locationId", "");
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, form), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/outside your authorised editing locations/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects editing or approving an existing organisation-wide meeting from a restricted location", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({ locationId: null }));
    const form = meetingForm();
    form.set("status", "APPROVED");
    form.set("minutes", "Minutes for approval");
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, form), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/outside your authorised editing locations/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each(["archive", "restore"])("rejects %s of an organisation-wide meeting from a restricted location", async (intent) => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({ locationId: null, status: intent === "archive" ? "DRAFT" : "ARCHIVED" }));
    const response = await updateMeeting(new Request(`http://localhost/api/meetings/${meetingId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent }),
    }), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/outside your authorised editing locations/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a foreign-location previous Action on create", async () => {
    const form = meetingForm();
    form.append("previousActionIds", "foreign-action");
    db.action.findFirst.mockResolvedValue(null);
    const response = await createMeeting(request("/api/meetings", form));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/previous action is not available/i);
    expect(db.action.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      id: "foreign-action", organisationId: context.organisation.id,
      OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }],
    }) });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("requires creation before minutes can be approved", async () => {
    const form = meetingForm();
    form.set("status", "APPROVED");
    form.set("minutes", "Minutes ready for approval");
    const response = await createMeeting(request("/api/meetings", form));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/create the meeting before approving/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects forged approval details during meeting creation", async () => {
    const form = meetingForm();
    form.set("approvedById", "someone-else");
    form.set("approvalDate", "2026-09-01");
    const response = await createMeeting(request("/api/meetings", form));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/approval must be recorded by the signed-in approver/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a foreign-location previous Action on update", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting());
    db.action.findFirst.mockResolvedValue(null);
    const form = meetingForm();
    form.append("previousActionIds", "foreign-action");
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, form), routeParams());
    expect(response.status).toBe(400);
    expect(db.action.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      id: "foreign-action", organisationId: context.organisation.id,
      OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }],
    }) });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("keeps inaccessible existing links when a restricted editor saves other changes", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({
      previousActionIds: ["hidden-action", "visible-action"],
      evidenceLinks: [{ evidenceId: "hidden-evidence" }, { evidenceId: "visible-evidence" }],
    }));
    db.action.findMany.mockResolvedValue([
      { id: "hidden-action", locationId: "branch-b" },
      { id: "visible-action", locationId: "branch-a" },
    ]);
    db.evidence.findMany.mockResolvedValue([
      { id: "hidden-evidence", locationId: "branch-b" },
      { id: "visible-evidence", locationId: "branch-a" },
    ]);
    const tx = mockTransaction();
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, meetingForm()), routeParams());
    expect(response.status).toBe(200);
    expect(tx.governanceMeeting.update).toHaveBeenCalledWith({
      where: { id: meetingId },
      data: expect.objectContaining({
        previousActionIds: ["hidden-action"],
        evidenceLinks: { deleteMany: {}, create: [{ evidenceId: "hidden-evidence" }] },
      }),
    });
  });

  it("binds approval to the signed-in actor and a server timestamp", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({ status: "AWAITING_APPROVAL" }));
    const tx = mockTransaction();
    const form = meetingForm();
    form.set("status", "APPROVED");
    form.set("minutes", "Discussion, challenge and decisions recorded.");
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, form), routeParams());
    expect(response.status).toBe(200);
    expect(tx.governanceMeeting.update).toHaveBeenCalledWith({ where: { id: meetingId }, data: expect.objectContaining({
      status: "APPROVED", approvedById: context.user.id, approvalDate: expect.any(Date),
    }) });
    expect(tx.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "APPROVAL", userId: context.user.id,
      afterValue: expect.objectContaining({ approvedById: context.user.id, approvalDate: expect.any(Date) }),
    }) });
  });

  it("rejects approval attributed to a different member", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({ status: "AWAITING_APPROVAL" }));
    const form = meetingForm();
    form.set("status", "APPROVED");
    form.set("minutes", "Discussion, challenge and decisions recorded.");
    form.set("approvedById", "someone-else");
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, form), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/cannot record approval on behalf/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a browser-supplied approval date", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({ status: "AWAITING_APPROVAL" }));
    const form = meetingForm();
    form.set("status", "APPROVED");
    form.set("minutes", "Discussion, challenge and decisions recorded.");
    form.set("approvalDate", "2026-09-01");
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, form), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/approval date is recorded automatically/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("requires completed minutes for the authenticated approval", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({ status: "AWAITING_APPROVAL" }));
    const form = meetingForm();
    form.set("status", "APPROVED");
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, form), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/completed minutes/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("does not overwrite existing approved minutes through the edit form", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({ status: "APPROVED" }));
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, meetingForm()), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/approved minutes cannot be edited/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("restores an archived meeting as draft and clears the previous approval", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({
      status: "ARCHIVED", approvedById: "manager-1", approvalDate: new Date("2026-09-20T10:00:00Z"),
      minutes: "Previously approved minutes", agendaItems: [],
    }));
    const tx = mockTransaction();
    const response = await updateMeeting(new Request(`http://localhost/api/meetings/${meetingId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: "restore" }),
    }), routeParams());
    expect(response.status).toBe(200);
    expect(tx.governanceMeeting.update).toHaveBeenCalledWith({ where: { id: meetingId }, data: {
      status: "DRAFT", archivedAt: null, approvedById: null, approvalDate: null,
    } });
    expect(tx.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "RESTORE", beforeValue: expect.objectContaining({ approvedById: "manager-1", minutes: "Previously approved minutes" }),
      afterValue: expect.objectContaining({ status: "DRAFT", approvedById: null, approvalDate: null }),
    }) });
  });

  it.each(["archive", "restore"])("does not %s a meeting that underpins a controlled decision", async (intent) => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({
      status: intent === "archive" ? "APPROVED" : "ARCHIVED",
      agendaItems: [{ id: "agenda-1", title: "Decision", notes: "Reviewed", decision: "Agreed", linkedActionId: null, controlledDecision: { id: "controlled-1" } }],
    }));
    const response = await updateMeeting(new Request(`http://localhost/api/meetings/${meetingId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent }),
    }), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/meeting with controlled decisions cannot be archived or restored/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each(["linked Action", "controlled decision"])("rejects removal of an agenda item with a %s", async (linkType) => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({
      agendaItems: [{ id: "protected-agenda", title: "Decision", notes: "Reviewed", decision: "Agreed",
        linkedActionId: linkType === "linked Action" ? "action-1" : null,
        controlledDecision: linkType === "controlled decision" ? { id: "decision-1" } : null }],
    }));
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, meetingForm()), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/cannot be removed/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("keeps existing agenda IDs while reordering and editing items", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({
      agendaItems: [
        { id: "agenda-1", title: "Decision", notes: "Reviewed", decision: "Agreed", linkedActionId: "action-1", controlledDecision: null },
        { id: "agenda-2", title: "Updates", notes: null, decision: null, linkedActionId: null, controlledDecision: null },
      ],
    }));
    const tx = mockTransaction();
    const form = meetingForm();
    form.set("agendaItemId", "agenda-2");
    form.append("agendaItemId", "agenda-1");
    form.set("agendaLinkedActionId", "");
    form.append("agendaLinkedActionId", "action-1");
    form.set("agendaTitle", "Updates revised");
    form.append("agendaTitle", "Decision");
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, form), routeParams());
    expect(response.status).toBe(200);
    expect(tx.meetingAgendaItem.update).toHaveBeenCalledTimes(4);
    expect(tx.meetingAgendaItem.update).toHaveBeenCalledWith({ where: { id: "agenda-2" }, data: expect.objectContaining({ sortOrder: 1 }) });
    expect(tx.meetingAgendaItem.update).toHaveBeenCalledWith({ where: { id: "agenda-1" }, data: expect.objectContaining({ sortOrder: 2 }) });
    expect(tx.meetingAgendaItem.deleteMany).not.toHaveBeenCalled();
    expect(tx.meetingAgendaItem.create).not.toHaveBeenCalled();
  });

  it("requires explicit restore before editing archived meeting content", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({ status: "ARCHIVED" }));
    const response = await updateMeeting(request(`/api/meetings/${meetingId}`, meetingForm()), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/restore the meeting/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each(["ARCHIVED", "CANCELLED"])("prevents Action extraction from a %s meeting", async (status) => {
    db.governanceMeeting.findFirst.mockResolvedValue({ status, locationId: "branch-a" });
    const response = await extractAction(request(`/api/meetings/${meetingId}/actions`, new FormData()), routeParams());
    expect(response.status).toBe(400);
    expect(db.meetingAgendaItem.findFirst).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("requires a recorded decision before Action extraction", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue({ status: "IN_PROGRESS", locationId: "branch-a" });
    db.meetingAgendaItem.findFirst.mockResolvedValue({ decision: "  ", linkedActionId: null });
    const form = new FormData();
    form.set("agendaId", "agenda-1");
    const response = await extractAction(request(`/api/meetings/${meetingId}/actions`, form), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/record a meeting decision/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("prevents a location-limited user creating an organisation-wide Action", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue({ status: "IN_PROGRESS", locationId: null });
    const response = await extractAction(request(`/api/meetings/${meetingId}/actions`, new FormData()), routeParams());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/outside your authorised editing locations/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("allows only one of two simultaneous requests to claim an agenda decision", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(editableMeeting({ status: "IN_PROGRESS", agendaItems: [{ decision: "Improve follow-up" }] }));
    db.meetingAgendaItem.findFirst.mockResolvedValue({ id: "agenda-1", meetingId, title: "Follow-up", notes: "Review", decision: "Improve follow-up", linkedActionId: null });
    let linkedActionId: string | null = null;
    let nextAction = 0;
    const tx = {
      action: {
        create: vi.fn().mockImplementation(async () => ({ id: `action-${++nextAction}`, organisationId: context.organisation.id })),
        count: vi.fn().mockResolvedValue(0),
      },
      meetingAgendaItem: {
        update: vi.fn().mockImplementation(async ({ data }: { data: { linkedActionId: string } }) => { linkedActionId = data.linkedActionId; }),
        updateMany: vi.fn().mockImplementation(async ({ data }: { data: { linkedActionId: string } }) => {
          if (linkedActionId) return { count: 0 };
          linkedActionId = data.linkedActionId;
          return { count: 1 };
        }),
      },
      actionUpdate: { create: vi.fn() },
      activityLog: { create: vi.fn() },
    };
    db.$transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
    const actionForm = () => {
      const form = new FormData();
      form.set("agendaId", "agenda-1");
      form.set("title", "Improve follow-up");
      form.set("ownerId", "manager-1");
      form.set("dueDate", "2026-10-01");
      form.set("expectedOutcome", "Follow-up completed");
      form.set("successMeasure", "Independent check");
      return form;
    };
    const responses = await Promise.all([
      extractAction(request(`/api/meetings/${meetingId}/actions`, actionForm()), routeParams()),
      extractAction(request(`/api/meetings/${meetingId}/actions`, actionForm()), routeParams()),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 400]);
    expect(tx.meetingAgendaItem.updateMany).toHaveBeenCalledTimes(2);
    expect(linkedActionId).toMatch(/^action-/);
  });

  it("scopes carried-forward Action titles in the printable agenda", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue({ ...printableMeeting(), previousActionIds: ["foreign-action"] });
    await AgendaPage(routeParams());
    expect(db.action.findMany).toHaveBeenCalledWith({ where: expect.objectContaining({
      organisationId: context.organisation.id,
      OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }],
    }), include: expect.any(Object) });
  });

  it("scopes newly created Action titles in the printable minutes", async () => {
    db.governanceMeeting.findFirst.mockResolvedValue(printableMeeting());
    await MinutesPage(routeParams());
    expect(db.action.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      organisationId: context.organisation.id,
      OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }],
    }) }));
  });
});
