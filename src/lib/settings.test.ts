import { describe, expect, it } from "vitest";
import {
  normaliseEmail,
  normaliseLocationCode,
  validateLicenceSeats,
  validateMemberAccess,
  validateTemporaryPassword,
} from "@/lib/settings";

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

  it("prevents the last active owner becoming read only", () => {
    expect(() =>
      validateMemberAccess({
        isSelf: false,
        currentRoleKey: "organisation-owner",
        nextRoleKey: "organisation-owner",
        nextStatus: "ACTIVE",
        currentAccessMode: "STANDARD",
        nextAccessMode: "READ_ONLY",
        activeOwnerCount: 1,
      }),
    ).toThrow("at least one active owner");
  });

  it("prevents self-removal from assigned locations", () => {
    expect(() => validateMemberAccess({ isSelf: true, currentRoleKey: "registered-manager", nextRoleKey: "registered-manager", nextStatus: "ACTIVE", activeOwnerCount: 1, currentAllLocations: false, nextAllLocations: false, currentLocationIds: ["one"], nextLocationIds: [] })).toThrow("location access");
  });

  it("does not allow fewer licences than active users", () => {
    expect(() => validateLicenceSeats(6, 7)).toThrow("7 active users");
    expect(() => validateLicenceSeats(7, 7)).not.toThrow();
  });
});
