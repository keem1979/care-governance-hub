import { describe, expect, it } from "vitest";
import { evidenceDisplayStatus, titleFromFileName, validateEvidenceFile } from "./evidence";

describe("evidence helpers", () => {
  const now = new Date("2026-07-25T12:00:00Z");
  it("derives expiry states", () => {
    expect(evidenceDisplayStatus("ACTIVE", new Date("2026-07-24"), now)).toBe("Expired");
    expect(evidenceDisplayStatus("ACTIVE", new Date("2026-08-10"), now)).toBe("Expiring soon");
    expect(evidenceDisplayStatus("ACTIVE", null, now)).toBe("Current");
  });
  it("creates human-friendly titles from filenames", () => {
    expect(titleFromFileName("staff_training-certificate.pdf")).toBe("staff training certificate");
  });
  it("blocks executable files", () => {
    expect(() => validateEvidenceFile(new File(["x"], "unsafe.exe", { type: "application/x-msdownload" }))).toThrow(/not an accepted/);
    expect(() => validateEvidenceFile(new File(["x"], "safe.pdf", { type: "application/pdf" }))).not.toThrow();
  });
});
