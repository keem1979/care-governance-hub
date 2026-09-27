import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { getInspectionRequirements } from "@/lib/inspection-data";
import { getCommissionerReadinessExceptions } from "@/lib/inspection-commissioner-exceptions";
import { PATCH as reviewMapping } from "@/app/api/inspection/[id]/evidence-mappings/[evidenceId]/route";
import { PATCH as updateRequirement } from "@/app/api/inspection/[id]/route";
import { PATCH as reviewMockSample } from "@/app/api/evidence-assurance/mock-inspections/[id]/samples/[sampleId]/route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/db", () => ({ createDb: vi.fn() }));
vi.mock("@/lib/inspection-baseline", () => ({ ensureInspectionBaseline: vi.fn() }));

const context = {
  user: { id: "reviewer-a" }, organisation: { id: "tenant-a" },
  allLocations: false, locations: [{ id: "branch-a" }],
  permissions: ["governance:view", "governance:edit", "reports:export"],
};

function dbMock() {
  const findMany = vi.fn().mockResolvedValue([]);
  return {
    complianceRequirement: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
    complianceRequirementEvidence: { findMany: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
    activityLog: { create: vi.fn() },
    organisationMembership: { findFirst: vi.fn() },
    evidence: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn() },
    audit: { findMany: vi.fn().mockResolvedValue([]) },
    registerEntry: { findMany: vi.fn().mockResolvedValue([]) },
    action: { findMany: vi.fn().mockResolvedValue([]) },
    policy: { findMany }, risk: { findMany }, kpiEntry: { findMany }, governanceMeeting: { findMany }, staffComplianceRecord: { findMany },
    governanceObligation: { findMany: vi.fn().mockResolvedValue([]) },
    kpiReturn: { findMany: vi.fn().mockResolvedValue([]) },
    mockInspectionSample: { findFirst: vi.fn().mockResolvedValue(null) },
    $disconnect: vi.fn(), $transaction: vi.fn(),
  };
}

let db: ReturnType<typeof dbMock>;
beforeEach(() => {
  vi.clearAllMocks();
  db = dbMock();
  vi.mocked(createDb).mockReturnValue(db as never);
  vi.mocked(requirePermission).mockResolvedValue(context as never);
});

describe("inspection and commissioner readiness scope", () => {
  it("filters all linked requirement children before assurance, page, pack or CSV compilation", async () => {
    await getInspectionRequirements(context as never);
    const query = db.complianceRequirement.findMany.mock.calls[0][0] as never;
    expect(query).toMatchObject({
      where: { organisationId: "tenant-a", OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }] },
      include: {
        evidenceLinks: { where: { evidence: { organisationId: "tenant-a", OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }] } } },
        auditLinks: { where: { audit: { organisationId: "tenant-a", locationId: { in: ["branch-a"] } } } },
        registerLinks: { where: { registerEntry: { organisationId: "tenant-a", OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }] } } },
        actionLinks: { where: { action: { organisationId: "tenant-a", OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }] } } },
      },
    });
  });

  it("keeps tagged suggestions and live signals out of evidenced category coverage", async () => {
    db.complianceRequirement.findMany.mockResolvedValue([{
      id: "requirement-a", catalogueKey: "well-kpis", expectedEvidenceCategories: ["OUTCOMES"], coveredEvidenceCategories: [],
      evidenceLinks: [], auditLinks: [], registerLinks: [], actionLinks: [],
      reviewDate: null, managementDecision: "NOT_REVIEWED", reviewedAt: null, signedOffAt: null,
    }] as never);
    db.evidence.findMany.mockResolvedValue([{
      id: "suggestion-a", locationId: "branch-a", title: "Outcome trend", category: "KPI", status: "ACTIVE",
      reviewExpiryDate: null, relatedModule: null, relatedRecordId: null, tags: ["requirement:well-kpis"], evidenceDate: null,
    }] as never);
    db.kpiEntry.findMany.mockResolvedValue([{
      id: "kpi-a", reportingMonth: new Date("2026-09-01"), ragStatus: "GREEN", kpi: { name: "Outcome" },
    }] as never);
    const [requirement] = await getInspectionRequirements(context as never);
    expect(requirement.connectedRecords.some((record) => record.id === "suggestion-a")).toBe(true);
    expect(requirement.coveredCategories).toEqual([]);
    expect(requirement.assurance.categoryCoverage).toBe(0);
    expect(requirement.assurance.status).not.toBe("ASSURED");
  });

  it("never presents organisation-wide assurance as ready through a restricted-location view", async () => {
    const verifiedAt = new Date("2026-09-20");
    db.complianceRequirement.findMany.mockResolvedValue([{
      id: "requirement-a", locationId: null, catalogueKey: "well-kpis",
      expectedEvidenceCategories: ["OUTCOMES"], coveredEvidenceCategories: ["OUTCOMES"],
      evidenceLinks: [{ decision: "SUITABLE", evidenceCategories: ["OUTCOMES"], evidenceId: "evidence-a", evidence: {
        id: "evidence-a", title: "Verified fictional outcome", status: "ACTIVE", category: "KPI", reviewExpiryDate: null,
        relatedModule: null, relatedRecordId: null, tags: [], updatedAt: new Date("2026-09-01"), currentVersionId: null,
        currentnessMode: null, currentnessStatus: null,
        verifications: [{ outcome: "VERIFIED", verifiedAt, evidenceVersionId: null, reviewDueAt: null }],
      } }],
      auditLinks: [], registerLinks: [], actionLinks: [], reviewDate: null,
      managementDecision: "ASSURED", reviewedAt: verifiedAt, signedOffAt: verifiedAt,
    }] as never);
    const [requirement] = await getInspectionRequirements(context as never);
    expect(requirement.scopeLimited).toBe(true);
    expect(requirement.assurance.status).toBe("NOT_READY");
    expect(requirement.assurance.blockers.join(" ")).toMatch(/location-scoped view/i);
  });

  it("requires a scoped Evidence child before changing suitability, even on a visible parent", async () => {
    const form = new FormData(); form.set("decision", "SUITABLE"); form.set("rationale", "This item is suitable for the stated requirement.");
    const response = await reviewMapping(new Request("http://localhost/api/inspection/requirement-a/evidence-mappings/foreign-evidence", { method: "PATCH", body: form }), { params: Promise.resolve({ id: "requirement-a", evidenceId: "foreign-evidence" }) });
    expect(response.status).toBe(404);
    expect(db.complianceRequirement.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      id: "requirement-a", organisationId: "tenant-a",
      evidenceLinks: { some: { evidenceId: "foreign-evidence", evidence: expect.objectContaining({ organisationId: "tenant-a", OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }] }) } },
    }), select: expect.any(Object) });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("retains inaccessible existing links when a scoped reviewer saves the visible form", async () => {
    db.complianceRequirement.findFirst.mockResolvedValue({
      id: "requirement-a", title: "Fictional requirement", locationId: null, catalogueKey: "well-policy-control",
      managementDecision: "NOT_REVIEWED", signedOffAt: null,
      evidenceLinks: [{ evidenceId: "hidden-evidence" }], auditLinks: [{ auditId: "hidden-audit" }],
      registerLinks: [{ registerEntryId: "hidden-register" }], actionLinks: [{ actionId: "hidden-action" }],
    } as never);
    const tx = {
      complianceRequirement: { update: vi.fn() },
      complianceRequirementEvidence: { deleteMany: vi.fn(), upsert: vi.fn() },
      activityLog: { create: vi.fn() },
    };
    db.$transaction.mockImplementation(async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx));
    const response = await updateRequirement(new Request("http://localhost/api/inspection/requirement-a", { method: "PATCH", body: new FormData() }), { params: Promise.resolve({ id: "requirement-a" }) });
    expect(response.status).toBe(200);
    expect(tx.complianceRequirement.update).toHaveBeenCalledWith({ where: { id: "requirement-a" }, data: expect.objectContaining({
      auditLinks: { deleteMany: {}, create: [{ auditId: "hidden-audit" }] },
      registerLinks: { deleteMany: {}, create: [{ registerEntryId: "hidden-register" }] },
      actionLinks: { deleteMany: {}, create: [{ actionId: "hidden-action" }] },
    }) });
    expect(tx.complianceRequirementEvidence.deleteMany).toHaveBeenCalledWith({ where: {
      requirementId: "requirement-a", evidenceId: { notIn: ["hidden-evidence"] },
    } });
  });

  it("denies an inaccessible mock sample and locks a completed sample", async () => {
    const form = new FormData(); form.set("outcome", "ASSURED"); form.set("observation", "Observed fictional practice and checked the record.");
    const params = { params: Promise.resolve({ id: "mock-a", sampleId: "sample-a" }) };
    const request = () => new Request("http://localhost/api/evidence-assurance/mock-inspections/mock-a/samples/sample-a", { method: "PATCH", body: form });
    expect((await reviewMockSample(request(), params)).status).toBe(404);
    expect(db.mockInspectionSample.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      requirement: expect.objectContaining({ organisationId: "tenant-a" }),
      mockInspection: expect.objectContaining({ organisationId: "tenant-a", samples: { every: { requirement: expect.objectContaining({ organisationId: "tenant-a" }) } } }),
    }), include: expect.any(Object) });
    db.mockInspectionSample.findFirst.mockResolvedValue({ mockInspection: { status: "COMPLETED" } } as never);
    expect((await reviewMockSample(request(), params)).status).toBe(409);
    expect(db.evidence.count).not.toHaveBeenCalled();
  });

  it("compiles commissioner exceptions only from this tenant and authorised locations", async () => {
    db.kpiReturn.findMany.mockResolvedValue([{
      id: "return-a", localAuthority: "Fictional Council", reportingMonth: new Date("2026-09-01"),
      status: "DRAFT", data: { serviceUserCancelledUnder24h: 2, serviceUserCancelledCalls: 1 }, location: { name: "Branch A" },
    }] as never);
    const rows = await getCommissionerReadinessExceptions(context as never);
    expect(rows).toContainEqual(expect.objectContaining({ id: "return-a", status: "DRAFT", dataCheckCount: 1, location: "Branch A" }));
    expect(db.governanceObligation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      organisationId: "tenant-a", OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }],
    }) }));
    expect(db.kpiReturn.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      organisationId: "tenant-a", locationId: { in: ["branch-a"] },
    }) }));
    expect(db.registerEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      organisationId: "tenant-a", OR: [{ locationId: null }, { locationId: { in: ["branch-a"] } }], definition: { key: "commissioner-contracts" },
    }) }));
  });
});
