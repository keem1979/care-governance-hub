import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  createDb: vi.fn(),
  putPrivateFile: vi.fn(),
  deletePrivateFile: vi.fn(),
  linkActionEvidence: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireAnyPermission: mocks.requireAnyPermission }));
vi.mock("@/lib/db", () => ({ createDb: mocks.createDb }));
vi.mock("@/lib/private-storage", () => ({ putPrivateFile: mocks.putPrivateFile, deletePrivateFile: mocks.deletePrivateFile }));
vi.mock("@/lib/action-assurance", () => ({
  ACTION_EVIDENCE_ROLES: ["SOURCE", "COMPLETION", "VERIFICATION", "EFFECTIVENESS", "CLOSURE"],
  linkActionEvidence: mocks.linkActionEvidence,
}));

import { POST } from "@/app/api/evidence/contextual/route";

const context = {
  organisation: { id: "tenant-a" }, user: { id: "uploader-a" },
  allLocations: false, locations: [{ id: "location-a" }],
  permissions: [PERMISSIONS.EVIDENCE_UPLOAD, PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.ACTIONS_MANAGE],
};
const register = {
  id: "incident-a", locationId: "location-a", reference: "INC-001", status: "OPEN",
  clientId: "client-a", staffMemberId: null,
};
const action = {
  id: "action-a", locationId: "location-a", reference: "ACT-001", status: "OPEN", closedAt: null, archivedAt: null,
  clientId: null, staffMemberId: "staff-a",
};

function request(fields: Record<string, string>, file?: File) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (file) form.set("document", file);
  return new Request("http://localhost/api/evidence/contextual", { method: "POST", body: form });
}
function document(name = "incident-photo.png") {
  return new File(["photo bytes"], name, { type: "image/png" });
}

let db: ReturnType<typeof makeDb>;
function makeDb() {
  const tx = {
    evidence: { create: vi.fn().mockResolvedValue({ id: "evidence-new" }), update: vi.fn().mockResolvedValue({}) },
    evidenceVersion: { create: vi.fn().mockResolvedValue({ id: "version-1" }) },
    registerEntryEvidence: { create: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    activityLog: { create: vi.fn().mockResolvedValue({}) },
  };
  return {
    action: { findFirst: vi.fn().mockResolvedValue(action) },
    registerEntry: { findFirst: vi.fn().mockResolvedValue(register) },
    evidence: { findFirst: vi.fn().mockResolvedValue({ id: "evidence-existing", locationId: "location-a" }) },
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    $disconnect: vi.fn().mockResolvedValue(undefined), tx,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db = makeDb();
  mocks.createDb.mockReturnValue(db);
  mocks.requireAnyPermission.mockResolvedValue(context);
  mocks.putPrivateFile.mockResolvedValue(undefined);
  mocks.deletePrivateFile.mockResolvedValue(undefined);
  mocks.linkActionEvidence.mockResolvedValue(undefined);
});

describe("contextual Evidence boundary", () => {
  it("creates one canonical Evidence and version, links the source, and records provenance", async () => {
    const response = await POST(request({ sourceType: "INCIDENT", sourceId: register.id }, document()));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "evidence-new", evidenceId: "evidence-new", linked: true });
    expect(db.registerEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: register.id, organisationId: "tenant-a", definition: { key: "incidents" } }),
    }));
    expect(db.tx.evidence.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      organisationId: "tenant-a", locationId: "location-a", ownerId: "uploader-a", uploadedById: "uploader-a",
      title: "incident photo", relatedModule: "RegisterEntry", relatedRecordId: register.id,
      sourceReference: register.reference, confidentiality: "CONFIDENTIAL",
    }) });
    expect(db.tx.evidenceVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      evidenceId: "evidence-new", versionNumber: "1.0", uploadedById: "uploader-a",
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
    }) });
    expect(db.tx.evidence.update).toHaveBeenCalledWith({ where: { id: "evidence-new" }, data: { currentVersionId: "version-1" } });
    expect(db.tx.registerEntryEvidence.create).toHaveBeenCalledWith({ data: { entryId: register.id, evidenceId: "evidence-new" } });
    expect(db.tx.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      organisationId: "tenant-a", locationId: "location-a", recordType: "Evidence", recordId: "evidence-new",
      afterValue: expect.objectContaining({ clientId: "client-a", version: "1.0" }),
    }) });
    expect(mocks.putPrivateFile).toHaveBeenCalledOnce();
  });

  it("reuses existing Evidence with the selected Action role without creating another Evidence", async () => {
    const response = await POST(request({ sourceType: "ACTION", sourceId: action.id, evidenceId: "evidence-existing", role: "VERIFICATION" }));
    expect(response.status).toBe(200);
    expect(db.action.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: action.id, organisationId: "tenant-a" }) }));
    expect(db.evidence.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "evidence-existing", organisationId: "tenant-a", status: "ACTIVE", archivedAt: null }) }));
    expect(mocks.linkActionEvidence).toHaveBeenCalledWith(db.tx, expect.objectContaining({ actionId: action.id, evidenceIds: ["evidence-existing"], role: "VERIFICATION", actorId: "uploader-a" }));
    expect(db.tx.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ recordType: "ActionEvidence", afterValue: expect.objectContaining({ role: "VERIFICATION" }) }) });
    expect(db.tx.evidence.create).not.toHaveBeenCalled();
    expect(mocks.putPrivateFile).not.toHaveBeenCalled();
  });

  it("uploads into an Action using its canonical Evidence role without making an assurance decision", async () => {
    const response = await POST(request({ sourceType: "ACTION", sourceId: action.id, role: "COMPLETION" }, document("completion.pdf")));
    expect(response.status).toBe(201);
    expect(db.tx.evidence.create).toHaveBeenCalledWith({ data: expect.objectContaining({ relatedModule: "Action", relatedRecordId: action.id, locationId: action.locationId }) });
    expect(mocks.linkActionEvidence).toHaveBeenCalledWith(db.tx, expect.objectContaining({ role: "COMPLETION", evidenceIds: ["evidence-new"] }));
    expect(db.tx.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ afterValue: expect.objectContaining({ role: "COMPLETION", staffMemberId: "staff-a" }) }) });
    expect(db.tx.evidence.create.mock.calls[0][0].data).not.toHaveProperty("verification");
    expect(db.tx.evidence.create.mock.calls[0][0].data).not.toHaveProperty("effectiveness");
  });

  it.each([
    ["foreign tenant or unscoped source", null, 404],
    ["closed source", { ...register, status: "CLOSED" }, 400],
    ["archived source", { ...register, status: "ARCHIVED" }, 400],
  ])("rejects %s before writing", async (_label, source, status) => {
    db.registerEntry.findFirst.mockResolvedValueOnce(source);
    const response = await POST(request({ sourceType: "INCIDENT", sourceId: register.id }, document()));
    expect(response.status).toBe(status);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.putPrivateFile).not.toHaveBeenCalled();
  });

  it("rejects a location-mismatched or invisible existing Evidence item", async () => {
    db.evidence.findFirst.mockResolvedValueOnce({ id: "evidence-existing", locationId: "location-b" });
    const response = await POST(request({ sourceType: "INCIDENT", sourceId: register.id, evidenceId: "evidence-existing" }));
    expect(response.status).toBe(404);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a closed Action before upload", async () => {
    db.action.findFirst.mockResolvedValueOnce({ ...action, closedAt: new Date("2026-01-01") });
    const response = await POST(request({ sourceType: "ACTION", sourceId: action.id, role: "SOURCE" }, document()));
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.putPrivateFile).not.toHaveBeenCalled();
  });

  it.each([
    ["completed", { status: "COMPLETED" }],
    ["cancelled", { status: "CANCELLED" }],
    ["archived status", { status: "ARCHIVED", closedAt: null }],
    ["archived timestamp", { status: "OPEN", archivedAt: new Date("2026-01-01"), closedAt: null }],
  ])("rejects %s Action before upload or link", async (_label, change) => {
    db.action.findFirst.mockResolvedValueOnce({ ...action, ...change });
    const response = await POST(request({ sourceType: "ACTION", sourceId: action.id, role: "COMPLETION" }, document()));
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.putPrivateFile).not.toHaveBeenCalled();
    expect(mocks.linkActionEvidence).not.toHaveBeenCalled();
  });

  it("requires exactly one new file or existing Evidence id", async () => {
    const both = await POST(request({ sourceType: "INCIDENT", sourceId: register.id, evidenceId: "evidence-existing" }, document()));
    const neither = await POST(request({ sourceType: "INCIDENT", sourceId: register.id }));
    expect(both.status).toBe(400);
    expect(neither.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("does not accept Action role escalation on a Register attachment", async () => {
    const response = await POST(request({ sourceType: "INCIDENT", sourceId: register.id, role: "VERIFICATION" }, document()));
    expect(response.status).toBe(400);
    expect(mocks.putPrivateFile).not.toHaveBeenCalled();
  });

  it.each([
    ["upload permission", [PERMISSIONS.GOVERNANCE_EDIT], { sourceType: "INCIDENT", sourceId: register.id }, true],
    ["source edit permission", [PERMISSIONS.EVIDENCE_UPLOAD], { sourceType: "INCIDENT", sourceId: register.id }, true],
    ["Action manage permission", [PERMISSIONS.EVIDENCE_UPLOAD], { sourceType: "ACTION", sourceId: action.id, role: "SOURCE" }, true],
  ])("enforces %s on the server", async (_label, permissions, fields, upload) => {
    mocks.requireAnyPermission.mockResolvedValueOnce({ ...context, permissions });
    const response = await POST(request(fields, upload ? document() : undefined));
    expect(response.status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.putPrivateFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported source, invalid role, and unsafe file before storage", async () => {
    for (const [fields, file] of [
      [{ sourceType: "RISK", sourceId: "risk-a" }, document()],
      [{ sourceType: "ACTION", sourceId: action.id, role: "APPROVED" }, document()],
      [{ sourceType: "INCIDENT", sourceId: register.id }, new File(["bad"], "script.exe", { type: "application/x-msdownload" })],
    ] as const) {
      expect((await POST(request(fields, file))).status).toBe(400);
    }
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.putPrivateFile).not.toHaveBeenCalled();
  });

  it("removes a private file if the canonical write fails", async () => {
    db.tx.evidence.create.mockRejectedValueOnce(new Error("database unavailable"));
    const response = await POST(request({ sourceType: "INCIDENT", sourceId: register.id }, document()));
    expect(response.status).toBe(400);
    expect(mocks.deletePrivateFile).toHaveBeenCalledWith(mocks.putPrivateFile.mock.calls[0][0]);
  });
});
