import { describe, expect, it } from "vitest";
import { evidenceCoverage, readinessSummary, splitEvidenceExamples } from "@/lib/inspection";
describe("inspection readiness", () => {
  it("weights evidence states as internal coverage", () => { expect(evidenceCoverage("EVIDENCE_REVIEWED")).toBe(100); expect(evidenceCoverage("NO_EVIDENCE")).toBe(0); });
  it("summarises coverage and gaps", () => expect(readinessSummary(["EVIDENCE_REVIEWED", "EVIDENCE_AVAILABLE", "NO_EVIDENCE"])).toEqual({ coverage: 58, reviewed: 1, gaps: 1 }));
  it("handles an empty requirement set", () => expect(readinessSummary([])).toEqual({ coverage: 0, reviewed: 0, gaps: 0 }));
  it("parses evidence examples", () => expect(splitEvidenceExamples("Audit report\nTraining matrix,Minutes")).toEqual(["Audit report", "Training matrix", "Minutes"]));
});
