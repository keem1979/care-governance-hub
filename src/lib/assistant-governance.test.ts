import { describe, expect, it } from "vitest";
import { assistantDigest, assistantEscalationReference, redactAssistantText } from "@/lib/assistant-governance";

describe("Abi governance controls", () => {
  it("redacts contact details and governed identifiers before audit storage", () => {
    const value = redactAssistantText("Email pat@example.com or call 07700 900123 about CLI-2026-00042 and 9434765919");
    expect(value).not.toContain("pat@example.com");
    expect(value).not.toContain("07700");
    expect(value).not.toContain("CLI-2026-00042");
    expect(value).not.toContain("9434765919");
    expect(value).toContain("redacted");
  });

  it("creates stable hashes without storing raw questions", async () => {
    expect(await assistantDigest("same question")).toBe(await assistantDigest("same question"));
    expect(await assistantDigest("same question")).not.toBe(await assistantDigest("different question"));
  });

  it("formats controlled escalation references", () => {
    expect(assistantEscalationReference(42, new Date("2026-08-20T00:00:00Z"))).toBe("ABI-2026-00042");
  });
});
