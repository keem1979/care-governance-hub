import { describe, expect, it } from "vitest";
import { policyDisplayStatus, safeDownloadName, splitList, validatePolicyFile } from "./policies";

describe("policy helpers", () => {
  const now = new Date("2026-07-25T12:00:00Z");
  it("derives overdue and due-for-review states", () => {
    expect(policyDisplayStatus("APPROVED", new Date("2026-07-24"), now)).toBe("Overdue");
    expect(policyDisplayStatus("APPROVED", new Date("2026-08-10"), now)).toBe("Due for review");
    expect(policyDisplayStatus("DRAFT", null, now)).toBe("Draft");
  });
  it("normalises tags and download names", () => {
    expect(splitList(" care, safety, , care ")).toEqual(["care", "safety", "care"]);
    expect(safeDownloadName('bad/na"me.pdf')).toBe("bad_na_me.pdf");
  });
  it("rejects unsupported policy uploads", () => {
    expect(() => validatePolicyFile(new File(["x"], "policy.exe", { type: "application/octet-stream" }))).toThrow(/PDF/);
    expect(() => validatePolicyFile(new File(["x"], "policy.pdf", { type: "application/pdf" }))).not.toThrow();
  });
});
