import { describe, expect, it } from "vitest";
import { findIdentityAnomalies, reconciliationReference, type IdentityRecord } from "@/lib/identity-reconciliation";

const client = (overrides: Partial<IdentityRecord>): IdentityRecord => ({
  id: "00000000-0000-4000-8000-000000000001", organisationId: "10000000-0000-4000-8000-000000000001",
  entityType: "CLIENT", reference: "CL-0001", firstName: "Avery", lastName: "Morgan", ...overrides,
});

describe("identity reconciliation", () => {
  it("raises a human-review case for a matching name and date of birth", () => {
    const anomalies = findIdentityAnomalies([
      client({ dateOfBirth: new Date("1980-01-01"), id: "00000000-0000-4000-8000-000000000001" }),
      client({ dateOfBirth: new Date("1980-01-01"), id: "00000000-0000-4000-8000-000000000002", reference: "CL-0002" }),
    ]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].matchSignals).toContain("Same date of birth");
  });

  it("never compares records across organisations", () => {
    const anomalies = findIdentityAnomalies([
      client({ email: "same@example.test" }),
      client({ id: "00000000-0000-4000-8000-000000000002", organisationId: "20000000-0000-4000-8000-000000000002", email: "same@example.test" }),
    ]);
    expect(anomalies).toHaveLength(0);
  });

  it("does not flag a common name without a corroborating signal", () => {
    expect(findIdentityAnomalies([client({}), client({ id: "00000000-0000-4000-8000-000000000002", reference: "CL-0002" })])).toHaveLength(0);
  });

  it("creates a controlled reference", () => {
    expect(reconciliationReference(12, new Date("2026-08-18"))).toBe("DQ-2026-00012");
  });
});
