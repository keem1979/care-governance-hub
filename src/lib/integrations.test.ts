import { describe, expect, it } from "vitest";
import { EXTERNAL_INTEGRATION_CANDIDATES, INTEGRATION_APPROVAL_GATES, NATIVE_DATA_FLOWS, integrationReviewCsv } from "@/lib/integrations";

describe("integration readiness", () => {
  it("separates active native flows from unconnected external candidates", () => {
    expect(NATIVE_DATA_FLOWS.length).toBeGreaterThanOrEqual(5);
    expect(EXTERNAL_INTEGRATION_CANDIDATES.every((item) => item.direction === "Supplier discovery required")).toBe(true);
  });

  it("requires a complete approval path before connection", () => {
    expect(INTEGRATION_APPROVAL_GATES.length).toBeGreaterThanOrEqual(8);
  });

  it("exports an honest review schedule", () => {
    const csv = integrationReviewCsv();
    expect(csv).toContain("NOT CONNECTED");
    expect(csv).toContain("Required next action");
  });
});
