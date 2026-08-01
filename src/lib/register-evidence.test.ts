import { describe, expect, it } from "vitest";
import { registerEvidenceCategory, registerEvidenceRequirementKey, registerKeyFromEvidenceTags } from "@/lib/register-evidence";

describe("register evidence mapping", () => {
  it("classifies common governance registers", () => {
    expect(registerEvidenceCategory("incidents")).toBe("Incidents");
    expect(registerEvidenceCategory("safeguarding")).toBe("Safeguarding");
    expect(registerEvidenceCategory("unknown-register")).toBe("Other");
  });

  it("maps live register records to evidence requirements", () => {
    expect(registerEvidenceRequirementKey("incidents")).toBe("safe-incidents");
    expect(registerEvidenceRequirementKey("call-log")).toBe("responsive-call-log");
    expect(registerEvidenceRequirementKey("unknown-register")).toBeUndefined();
  });

  it("reads the register source from evidence tags", () => {
    expect(registerKeyFromEvidenceTags(["system-generated", "register:complaints"])).toBe("complaints");
  });
});
