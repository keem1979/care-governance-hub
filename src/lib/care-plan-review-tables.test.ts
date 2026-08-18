import { describe, expect, it } from "vitest";
import {
  escalationTableColumns,
  parseStructuredTable,
  readUnderstoodTableColumns,
  structuredTableRowHasValue,
} from "./care-plan-review-tables";

describe("care-plan review structured tables", () => {
  it("loads saved JSON rows without losing column meaning", () => {
    const rows = parseStructuredTable(JSON.stringify([{ staffMember: "Alex", role: "Carer", sent: "Yes", read: "Yes" }]), readUnderstoodTableColumns);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ staffMember: "Alex", role: "Carer", sent: "Yes", read: "Yes", understood: "" });
  });

  it("converts older pipe-separated records and ignores their header row", () => {
    const rows = parseStructuredTable(
      "Trigger / concern | Severity | Immediate action | Who to contact | Response timescale | Information to provide | Follow-up responsibility | Outcome evidence\nBreathing changes | High | Call 999 | Emergency services | Immediately | Baseline and observations | Shift lead | Incident record",
      escalationTableColumns,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ trigger: "Breathing changes", severity: "High", contact: "Emergency services" });
  });

  it("does not count empty editor rows as recorded data", () => {
    expect(structuredTableRowHasValue({ staffMember: "", role: "" })).toBe(false);
    expect(structuredTableRowHasValue({ staffMember: "Alex", role: "" })).toBe(true);
  });
});
