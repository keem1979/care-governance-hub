import { describe,expect,it } from "vitest";
import { auditStatusLabel, calculateAuditScore, scoreAnswer } from "./audits";
describe("audit scoring", () => {
  it("scores compliance answers", () => { expect(scoreAnswer("COMPLIANT")).toBe(100); expect(scoreAnswer("PARTIALLY_COMPLIANT")).toBe(50); expect(scoreAnswer("NON_COMPLIANT")).toBe(0); expect(scoreAnswer("NOT_APPLICABLE")).toBeNull(); });
  it("calculates a weighted score and excludes N/A", () => { expect(calculateAuditScore([{score:100,weighting:2},{score:50,weighting:1},{score:null,weighting:5}])).toBe(83.3); });
  it("formats workflow labels", () => { expect(auditStatusLabel("AWAITING_REVIEW")).toBe("Awaiting review"); });
});
