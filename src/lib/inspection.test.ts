import { describe, expect, it } from "vitest";
import { evidenceCoverage, readinessSummary, splitEvidenceExamples } from "@/lib/inspection";
import { calculateInspectionAssurance } from "@/lib/inspection-assurance";
describe("inspection readiness", () => {
  it("weights evidence states as internal coverage", () => { expect(evidenceCoverage("EVIDENCE_REVIEWED")).toBe(100); expect(evidenceCoverage("NO_EVIDENCE")).toBe(0); });
  it("summarises coverage and gaps", () => expect(readinessSummary(["EVIDENCE_REVIEWED", "EVIDENCE_AVAILABLE", "NO_EVIDENCE"])).toEqual({ coverage: 58, reviewed: 1, gaps: 1 }));
  it("handles an empty requirement set", () => expect(readinessSummary([])).toEqual({ coverage: 0, reviewed: 0, gaps: 0 }));
  it("parses evidence examples", () => expect(splitEvidenceExamples("Audit report\nTraining matrix,Minutes")).toEqual(["Audit report", "Training matrix", "Minutes"]));
  it("never reports assurance from a manual label without current evidence and RM sign-off", () => {
    expect(calculateInspectionAssurance({reviewDate:null,expectedCategories:["PROCESSES"],coveredCategories:["PROCESSES"],currentEvidence:0,expiredEvidence:0,activeAudits:0,unresolvedFindings:0,activeRegisters:0,openActions:0,overdueActions:0,liveSignals:0,adverseSignals:0,managementDecision:"ASSURED",reviewedAt:new Date(),signedOffAt:new Date()}).status).toBe("NOT_READY");
  });
  it("blocks assurance when evidence expires or improvement is overdue", () => {
    const result=calculateInspectionAssurance({reviewDate:new Date("2027-01-01"),expectedCategories:["PROCESSES","OUTCOMES"],coveredCategories:["PROCESSES","OUTCOMES"],currentEvidence:2,expiredEvidence:1,activeAudits:1,unresolvedFindings:0,activeRegisters:0,openActions:1,overdueActions:1,liveSignals:0,adverseSignals:0,managementDecision:"ASSURED",reviewedAt:new Date("2026-01-01"),signedOffAt:new Date("2026-01-01"),now:new Date("2026-06-01")});
    expect(result.status).toBe("NOT_READY"); expect(result.blockers.join(" ")).toContain("expired evidence"); expect(result.blockers.join(" ")).toContain("overdue improvement");
  });
  it("requires all expected evidence categories and RM sign-off for full assurance", () => {
    const base={reviewDate:new Date("2027-01-01"),expectedCategories:["PROCESSES","OUTCOMES"],currentEvidence:2,expiredEvidence:0,activeAudits:1,unresolvedFindings:0,activeRegisters:1,openActions:0,overdueActions:0,liveSignals:1,adverseSignals:0,managementDecision:"ASSURED",reviewedAt:new Date("2026-01-01"),now:new Date("2026-06-01")};
    expect(calculateInspectionAssurance({...base,coveredCategories:["PROCESSES"],signedOffAt:new Date("2026-01-01")}).status).toBe("PARTIALLY_ASSURED");
    expect(calculateInspectionAssurance({...base,coveredCategories:["PROCESSES","OUTCOMES"],signedOffAt:null}).status).toBe("PARTIALLY_ASSURED");
    expect(calculateInspectionAssurance({...base,coveredCategories:["PROCESSES","OUTCOMES"],signedOffAt:new Date("2026-01-01")}).status).toBe("ASSURED");
  });
});
