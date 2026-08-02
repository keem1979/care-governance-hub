import { describe, expect, it } from "vitest";
import { generatedPolicyEvidenceData } from "@/lib/policy-evidence";

const input = {
  policyId: "policy-1", organisationId: "org-1", title: "Medicines management",
  category: "Medicines", ownerId: "owner-1", actorId: "actor-1",
  effectiveDate: null, nextReviewDate: new Date("2027-08-01T00:00:00Z"),
  status: "DRAFT", approvalStatus: "NOT_SUBMITTED", templateKey: "medicines",
  templateVersion: "2026.1", complianceAreas: ["Regulation 12"],
};

describe("generated policy evidence", () => {
  it("creates a live link without a duplicate document", () => {
    const data = generatedPolicyEvidenceData(input);
    expect(data.generatedPolicyId).toBe("policy-1");
    expect(data.generatedPolicyTemplateKey).toBe("medicines");
    expect(data.relatedModule).toBe("Policy");
    expect(data.notes).toContain("One-copy live evidence link");
    expect(data.status).toBe("ACTIVE");
  });

  it("follows policy approval and archive state", () => {
    const data = generatedPolicyEvidenceData({ ...input, status: "ARCHIVED", approvalStatus: "APPROVED" });
    expect(data.evidenceType).toBe("Approved policy");
    expect(data.status).toBe("ARCHIVED");
    expect(data.archivedAt).toBeInstanceOf(Date);
  });
});
