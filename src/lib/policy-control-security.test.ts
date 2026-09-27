import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PATCH as updatePolicy } from "@/app/api/policies/[id]/route";
import { POST as uploadPolicyVersion } from "@/app/api/policies/[id]/versions/route";
import { PATCH as updateDecision } from "@/app/api/governance-control/decisions/[id]/route";
import { PATCH as updateObligation } from "@/app/api/governance-control/obligations/[id]/route";
import { POST as prepareCatalogue } from "@/app/api/policies/catalogue/route";
import { providerControlVisibleToContext } from "@/lib/provider-controls";

vi.mock("@/lib/auth/dal", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/db", () => ({ createDb: vi.fn() }));
vi.mock("@/lib/policy-evidence", () => ({ syncGeneratedPolicyEvidence: vi.fn() }));
vi.mock("@/lib/policy-storage", () => ({ putPolicyFile: vi.fn(), deletePolicyFile: vi.fn() }));

const context = {
  user: { id: "manager-a" },
  organisation: { id: "organisation-a" },
  allLocations: false,
  locations: [{ id: "location-a" }],
};
const policyId = "policy-a";
const params = { params: Promise.resolve({ id: policyId }) };

function policy(overrides: Record<string, unknown> = {}) {
  return {
    id: policyId, organisationId: context.organisation.id, title: "Fictional safeguarding policy",
    category: "Safeguarding", ownerId: "manager-a", status: "DRAFT", approvalStatus: "NOT_SUBMITTED",
    approvedById: null, approvedAt: null, lastReviewDate: null, currentVersionId: "version-a",
    templateKey: null, generatedSections: null, ...overrides,
  };
}

function dbMock() {
  const tx = {
    policy: { update: vi.fn().mockResolvedValue(policy()), create: vi.fn() },
    activityLog: { create: vi.fn() },
  };
  return {
    policy: { findFirst: vi.fn().mockResolvedValue(policy()), findMany: vi.fn().mockResolvedValue([]) },
    organisation: { findUnique: vi.fn().mockResolvedValue({ name: "Fictional Care", policyBrandName: null, policyRegistrationNumber: null, policyAddress: null, policyEmail: null, policyPhone: null, policyWebsite: null, policyPrimaryColour: "#047857", policyFooterText: null }) },
    organisationMembership: { findFirst: vi.fn().mockResolvedValue({ userId: "manager-a" }) },
    evidence: { findFirst: vi.fn() },
    governanceDecision: { findFirst: vi.fn() },
    governanceObligation: { findFirst: vi.fn() },
    $transaction: vi.fn(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)),
    $disconnect: vi.fn(), tx,
  };
}

let db: ReturnType<typeof dbMock>;
function policyRequest(form: FormData) { return new Request(`http://localhost/api/policies/${policyId}`, { method: "PATCH", body: form }); }
function editForm(status: string) {
  const form = new FormData();
  form.set("title", "Fictional safeguarding policy"); form.set("category", "Safeguarding");
  form.set("ownerId", "manager-a"); form.set("status", status);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  db = dbMock();
  vi.mocked(createDb).mockReturnValue(db as never);
  vi.mocked(requirePermission).mockResolvedValue(context as never);
});

describe("policy approval integrity", () => {
  it.each(["APPROVED", "ARCHIVED"])("rejects generic edit into %s", async (status) => {
    const response = await updatePolicy(policyRequest(editForm(status)), params);
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("requires canonical policy content before recording approval", async () => {
    db.policy.findFirst.mockResolvedValue(policy({ currentVersionId: null }));
    const form = new FormData(); form.set("intent", "approve");
    const response = await updatePolicy(policyRequest(form), params);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/document|content/i);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("blocks editing an approved policy until an explicit review starts", async () => {
    db.policy.findFirst.mockResolvedValue(policy({ status: "APPROVED", approvalStatus: "APPROVED" }));
    const response = await updatePolicy(policyRequest(editForm("UNDER_REVIEW")), params);
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("starts a review with actor history and clears approval metadata", async () => {
    db.policy.findFirst.mockResolvedValue(policy({ status: "APPROVED", approvalStatus: "APPROVED", approvedById: "manager-a", approvedAt: new Date() }));
    const form = new FormData(); form.set("intent", "start-review");
    const response = await updatePolicy(policyRequest(form), params);
    expect(response.status).toBe(200);
    expect(db.tx.policy.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "UNDER_REVIEW", approvalStatus: "PENDING", approvedById: null, approvedAt: null }) }));
    expect(db.tx.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "manager-a", action: "STATUS_CHANGE" }) }));
  });

  it("resets approval when restoring an archived policy to draft", async () => {
    db.policy.findFirst.mockResolvedValue(policy({ status: "ARCHIVED", approvalStatus: "APPROVED", approvedById: "manager-a", approvedAt: new Date() }));
    const form = new FormData(); form.set("intent", "restore");
    const response = await updatePolicy(policyRequest(form), params);
    expect(response.status).toBe(200);
    expect(db.tx.policy.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT", approvalStatus: "NOT_SUBMITTED", approvedById: null, approvedAt: null }) }));
  });

  it("rejects document replacement while the policy is approved", async () => {
    db.policy.findFirst.mockResolvedValue(policy({ status: "APPROVED" }));
    const form = new FormData(); form.set("versionNumber", "2.0"); form.set("document", new File(["fictional"], "policy.pdf", { type: "application/pdf" }));
    const response = await uploadPolicyVersion(new Request(`http://localhost/api/policies/${policyId}/versions`, { method: "POST", body: form }), params);
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("clears historical approval when an archived catalogue policy is regenerated as a draft", async () => {
    db.policy.findMany.mockResolvedValue([policy({ status: "ARCHIVED", approvalStatus: "APPROVED", approvedById: "manager-a", approvedAt: new Date(), templateKey: "adult-safeguarding" })]);
    const form = new FormData(); form.set("ownerId", "manager-a"); form.set("templateKeys", "adult-safeguarding");
    const response = await prepareCatalogue(new Request("http://localhost/api/policies/catalogue", { method: "POST", body: form }));
    expect(response.status).toBe(201);
    expect(db.tx.policy.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      status: "DRAFT", approvalStatus: "NOT_SUBMITTED", approvedById: null, approvedAt: null,
    }) }));
  });
});

describe("location boundaries", () => {
  it("hides a Provider Control with only foreign-location versions", () => {
    expect(providerControlVisibleToContext(context, [{ scopeType: "SELECTED_LOCATIONS", locations: [{ locationId: "location-b" }] }])).toBe(false);
    expect(providerControlVisibleToContext(context, [{ scopeType: "SELECTED_LOCATIONS", locations: [{ locationId: "location-a" }] }])).toBe(true);
    expect(providerControlVisibleToContext(context, [{ scopeType: "SELECTED_LOCATIONS", locations: [{ locationId: "location-a" }, { locationId: "location-b" }] }])).toBe(false);
    expect(providerControlVisibleToContext(context, [{ scopeType: "ORGANISATION", locations: [] }])).toBe(false);
  });

  it("rejects foreign-location Evidence on decision implementation", async () => {
    db.governanceDecision.findFirst.mockResolvedValue({ id: "decision-a", organisationId: context.organisation.id, locationId: "location-a", status: "RECORDED", impact: "LOW" });
    db.evidence.findFirst.mockResolvedValue(null);
    const form = new FormData(); form.set("intent", "implement"); form.set("note", "Implemented fictional control with documented checks."); form.set("evidenceId", "evidence-b");
    const response = await updateDecision(new Request("http://localhost/api/governance-control/decisions/decision-a", { method: "PATCH", body: form }), { params: Promise.resolve({ id: "decision-a" }) });
    expect(response.status).toBe(400);
    expect(db.evidence.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      id: "evidence-b", organisationId: "organisation-a", OR: [{ locationId: null }, { locationId: "location-a" }],
    }) }));
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects foreign-location Evidence on an external obligation submission", async () => {
    db.governanceObligation.findFirst.mockResolvedValue({ id: "obligation-a", organisationId: context.organisation.id, locationId: "location-a", status: "OPEN", chaseCount: 0 });
    db.evidence.findFirst.mockResolvedValue(null);
    const form = new FormData(); form.set("updateType", "SUBMISSION"); form.set("note", "Fictional submission sent for review."); form.set("nextStatus", "SUBMITTED"); form.set("evidenceId", "evidence-b"); form.set("submissionReference", "REF-TEST");
    const response = await updateObligation(new Request("http://localhost/api/governance-control/obligations/obligation-a", { method: "PATCH", body: form }), { params: Promise.resolve({ id: "obligation-a" }) });
    expect(response.status).toBe(400);
    expect(db.evidence.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      id: "evidence-b", organisationId: "organisation-a", OR: [{ locationId: null }, { locationId: "location-a" }],
    }) }));
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
