import { describe, expect, it } from "vitest";
import { allIntegrationGatesPassed, classifyImportRow, connectionCanActivate, importBatchStatus, offlineCaptureConflict } from "@/lib/connected-governance";

const gates = { gateBusinessNeed: true, gateDataProtection: true, gateSupplierAssurance: true, gateSecurityDesign: true, gateTechnicalMapping: true, gateSafeTesting: true, gateOperations: true, gateApproval: true };

describe("connected governance controls", () => {
  it("requires every integration approval gate", () => {
    expect(allIntegrationGatesPassed(gates)).toBe(true);
    expect(connectionCanActivate({ ...gates, gateDataProtection: false, ownerId: "u1", reviewDueAt: new Date("2030-01-01") }, new Date("2026-01-01")).allowed).toBe(false);
  });

  it("never silently overwrites exact or ambiguous identities", () => {
    expect(classifyImportRow({ target: "CLIENT", externalId: "A1", firstName: "Pat", lastName: "Lee", exactMatch: true, candidates: [] }).status).toBe("EXACT_MATCH");
    expect(classifyImportRow({ target: "CLIENT", externalId: "A2", firstName: "Pat", lastName: "Lee", exactMatch: false, candidates: ["c1"] }).status).toBe("POTENTIAL_MATCH");
    expect(classifyImportRow({ target: "CLIENT", externalId: "A3", firstName: "New", lastName: "Person", exactMatch: false, candidates: [] }).status).toBe("READY_TO_CREATE");
  });

  it("keeps conflicts visible at batch level", () => {
    expect(importBatchStatus({ ready: 2, conflicts: 1, invalid: 0, applied: 0, total: 3 })).toBe("AWAITING_RECONCILIATION");
    expect(importBatchStatus({ ready: 2, conflicts: 0, invalid: 0, applied: 0, total: 2 })).toBe("READY_TO_APPLY");
  });

  it("detects a source changed after offline capture began", () => {
    expect(offlineCaptureConflict({ baseUpdatedAt: new Date("2026-01-01"), sourceUpdatedAt: new Date("2026-01-02") })).toMatch(/changed/);
    expect(offlineCaptureConflict({ baseUpdatedAt: new Date("2026-01-02"), sourceUpdatedAt: new Date("2026-01-01") })).toBeNull();
  });
});
