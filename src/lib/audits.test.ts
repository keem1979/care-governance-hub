import { describe,expect,it } from "vitest";
import { AUDIT_EVIDENCE_SOURCE_OPTIONS, auditEvidenceSourceLabel, auditStatusLabel, calculateAuditScore, hasTraceableAuditEvidence, scoreAnswer } from "./audits";
import { auditEvidenceRequirementKeys, auditKeyFromEvidenceTags } from "./audit-evidence";
describe("audit scoring", () => {
  it("scores compliance answers", () => { expect(scoreAnswer("COMPLIANT")).toBe(100); expect(scoreAnswer("PARTIALLY_COMPLIANT")).toBe(50); expect(scoreAnswer("NON_COMPLIANT")).toBe(0); expect(scoreAnswer("NOT_APPLICABLE")).toBeNull(); });
  it("calculates a weighted score and excludes N/A", () => { expect(calculateAuditScore([{score:100,weighting:2},{score:50,weighting:1},{score:null,weighting:5}])).toBe(83.3); });
  it("formats workflow labels", () => { expect(auditStatusLabel("AWAITING_REVIEW")).toBe("Awaiting review"); });
});
describe("audit evidence sources", () => {
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
describe("audit evidence mapping", () => {
  it("maps specialist audits to evidence requirements", () => {
    expect(auditEvidenceRequirementKeys("staff-competency")).toEqual(["effective-competency-matrix", "effective-spot-checks"]);
    expect(auditEvidenceRequirementKeys("unknown-form")).toEqual(["well-audit-programme"]);
  });
  it("reads the stable audit key from evidence tags", () => {
    expect(auditKeyFromEvidenceTags(["system-generated", "audit:care-call-delivery"])).toBe("care-call-delivery");
  });
});
