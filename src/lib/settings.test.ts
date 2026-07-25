import { describe, expect, it } from "vitest";
import { normaliseEmail, normaliseLocationCode, validateMemberAccess, validateTemporaryPassword } from "@/lib/settings";

describe("settings safeguards", () => {
  it("normalises email and location codes", () => {
    expect(normaliseEmail("  User@Example.COM ")).toBe("user@example.com");
    expect(normaliseLocationCode("main service!")).toBe("MAINSERVICE");
  });

  it("requires strong temporary passwords", () => {
    expect(() => validateTemporaryPassword("short")).toThrow();
    expect(() => validateTemporaryPassword("SecurePass123")).not.toThrow();
  });

  it("prevents administrators changing their own role or status", () => {
    expect(() => validateMemberAccess({ isSelf: true, currentRoleKey: "organisation-owner", nextRoleKey: "read-only-viewer", nextStatus: "ACTIVE", activeOwnerCount: 2, currentAllLocations: true, nextAllLocations: true })).toThrow("own role");
  });

  it("preserves the last active owner", () => {
    expect(() => validateMemberAccess({ isSelf: false, currentRoleKey: "organisation-owner", nextRoleKey: "read-only-viewer", nextStatus: "ACTIVE", activeOwnerCount: 1 })).toThrow("at least one active owner");
  });

  it("prevents self-removal from assigned locations", () => {
    expect(() => validateMemberAccess({ isSelf: true, currentRoleKey: "registered-manager", nextRoleKey: "registered-manager", nextStatus: "ACTIVE", activeOwnerCount: 1, currentAllLocations: false, nextAllLocations: false, currentLocationIds: ["one"], nextLocationIds: [] })).toThrow("location access");
  });
});
