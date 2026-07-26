import { describe, expect, it } from "vitest";
import { formatUkDateTime, ukGreeting } from "@/lib/dashboard";

describe("UK dashboard time", () => {
  it("uses London time for the greeting during GMT", () => {
    expect(ukGreeting(new Date("2026-01-15T11:30:00Z"))).toBe("morning");
    expect(ukGreeting(new Date("2026-01-15T12:30:00Z"))).toBe("afternoon");
  });

  it("automatically follows British Summer Time", () => {
    expect(ukGreeting(new Date("2026-07-15T16:30:00Z"))).toBe("afternoon");
    expect(ukGreeting(new Date("2026-07-15T17:30:00Z"))).toBe("evening");
  });

  it("shows the UK date, time and timezone", () => {
    const formatted = formatUkDateTime(new Date("2026-07-25T14:05:00Z"));
    expect(formatted).toContain("Saturday");
    expect(formatted).toContain("25 July 2026");
    expect(formatted).toContain("15:05");
    expect(formatted).toMatch(/BST|GMT\+1/);
  });
});
