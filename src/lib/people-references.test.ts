import { describe, expect, it } from "vitest";
import { formatPersonReference } from "@/lib/people-references";

describe("automatic people references", () => {
  it("creates stable sequential client and staff references", () => {
    expect(formatPersonReference("CLI", 1)).toBe("CLI-000001");
    expect(formatPersonReference("STF", 42)).toBe("STF-000042");
  });
  it("rejects invalid numbers", () => expect(() => formatPersonReference("CLI", 0)).toThrow());
});
