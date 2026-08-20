import { describe, expect, it } from "vitest";
import { evidenceAssuranceState, mappingSupportsClaim } from "@/lib/evidence-assurance";

const now = new Date("2026-08-18T12:00:00Z");

describe("evidence assurance", () => {
  it("does not treat an upload as verified evidence", () => expect(evidenceAssuranceState({ status: "ACTIVE", reviewExpiryDate: null, updatedAt: now, currentVersionId: "v1" }, now)).toBe("UNVERIFIED"));
  it("invalidates verification when the current file version changes", () => expect(evidenceAssuranceState({ status: "ACTIVE", reviewExpiryDate: null, updatedAt: now, currentVersionId: "v2", verification: { outcome: "VERIFIED", verifiedAt: now, evidenceVersionId: "v1", reviewDueAt: null } }, now)).toBe("STALE_VERIFICATION"));
  it("requires both suitability and current verification for a full claim", () => {
    expect(mappingSupportsClaim("SUITABLE", "CURRENT_VERIFIED")).toBe("FULL");
    expect(mappingSupportsClaim("PENDING", "CURRENT_VERIFIED")).toBe("NONE");
    expect(mappingSupportsClaim("SUITABLE", "UNVERIFIED")).toBe("NONE");
  });
});
