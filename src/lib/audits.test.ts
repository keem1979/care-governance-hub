import { describe,expect,it } from "vitest";
import { AUDIT_EVIDENCE_SOURCE_OPTIONS, auditEligibleEvidenceWhere, auditEvidenceSourceLabel, auditQuickStartSample, auditStatusLabel, calculateAuditScore, hasTraceableAuditEvidence, scoreAnswer } from "./audits";
import { auditEvidenceRequirementKeys, auditKeyFromEvidenceTags } from "./audit-evidence";
describe("audit scoring", () => {
  it("scores compliance answers", () => { expect(scoreAnswer("COMPLIANT")).toBe(100); expect(scoreAnswer("PARTIALLY_COMPLIANT")).toBe(50); expect(scoreAnswer("NON_COMPLIANT")).toBe(0); expect(scoreAnswer("NOT_APPLICABLE")).toBeNull(); });
  it("calculates a weighted score and excludes N/A", () => { expect(calculateAuditScore([{score:100,weighting:2},{score:50,weighting:1},{score:null,weighting:5}])).toBe(83.3); });
  it("formats workflow labels", () => { expect(auditStatusLabel("AWAITING_REVIEW")).toBe("Awaiting review"); });
});
describe("audit evidence sources", () => {
  it("limits controlled Evidence to the audit service or organisation-wide records while retaining actor scope", () => {
    expect(auditEligibleEvidenceWhere({ organisation: { id: "org" }, allLocations: false, locations: [{ id: "guildford" }] }, "guildford")).toEqual({ AND: [{ organisationId: "org", OR: [{ locationId: null }, { locationId: { in: ["guildford"] } }] }, { status: "ACTIVE", archivedAt: null, OR: [{ locationId: null }, { locationId: "guildford" }] }] });
  });
  it("covers the principal QCGMS and external evidence routes", () => {
    const values = AUDIT_EVIDENCE_SOURCE_OPTIONS.map((item) => item.value);
    expect(values.length).toBeGreaterThanOrEqual(20);
    expect(values).toEqual(expect.arrayContaining(["POLICY_PROCEDURE", "CARE_PLAN_REVIEW", "INCIDENT_NEAR_MISS", "TRAINING_COMPETENCY", "KPI_PERFORMANCE", "BUSINESS_CONTINUITY", "EXTERNAL_PARTNER"]));
  });
  it("requires either a controlled record or a source type with an exact reference", () => {
    expect(hasTraceableAuditEvidence({ evidenceId: "evidence-1" })).toBe(true);
    expect(hasTraceableAuditEvidence({ evidenceSourceType: "BUSINESS_CONTINUITY", evidenceSourceReference: "BCP exercise 2026-08" })).toBe(true);
    expect(hasTraceableAuditEvidence({ evidenceSourceType: "BUSINESS_CONTINUITY", evidenceSourceReference: "" })).toBe(false);
    expect(auditEvidenceSourceLabel("BUSINESS_CONTINUITY")).toContain("BCP");
  });
});
describe("audit quick start", () => {
  it("uses a whole-plan review for business continuity without asking the RM to configure sampling", () => {
    expect(auditQuickStartSample("business-continuity-audit")).toEqual({ method: "FULL_POPULATION", size: 1 });
  });
  it("uses a safe representative default for record-sampling audits", () => {
    expect(auditQuickStartSample("care-record-audit")).toEqual({ method: "RISK_AND_RANDOM", size: 5 });
  });
});
describe("audit evidence mapping", () => {
  it("maps specialist audits to evidence requirements", () => {
    expect(auditEvidenceRequirementKeys("staff-competency")).toEqual(["effective-competency-matrix", "effective-spot-checks"]);
    expect(auditEvidenceRequirementKeys("unknown-form")).toEqual(["well-audit-programme"]);
  });
  it("reads the stable audit key from evidence tags", () => {
    expect(auditKeyFromEvidenceTags(["system-generated", "audit:care-call-delivery"])).toBe("care-call-delivery");
  });
});
