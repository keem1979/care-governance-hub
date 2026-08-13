import { describe, expect, it } from "vitest";
import { PREMIUM_TEMPLATES } from "@/lib/premium-templates";

describe("premium template library", () => {
  it("covers the registered manager governance lifecycle", () => {
    expect(PREMIUM_TEMPLATES.length).toBeGreaterThanOrEqual(25);
    expect(new Set(PREMIUM_TEMPLATES.map((item) => item.category)).size).toBeGreaterThanOrEqual(12);
    expect(PREMIUM_TEMPLATES.every((item) => item.body.includes("MANAGEMENT ASSURANCE AND SIGN-OFF"))).toBe(true);
  });

  it("provides enough structured content for premium table-based documents", () => {
    for (const template of PREMIUM_TEMPLATES) {
      expect(template.body).toContain("DOCUMENT CONTROL");
      expect(template.body).toContain("ACTION AND VERIFICATION");
      expect(template.body.split("\n").filter((line) => line.endsWith(":")).length).toBeGreaterThanOrEqual(12);
    }
  });
});
