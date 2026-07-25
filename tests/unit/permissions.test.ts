import { describe, expect, it } from "vitest";
import {
  hasPermission,
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_PERMISSION_MAP,
} from "@/lib/permissions";

describe("central role permissions", () => {
  it("prevents a read-only viewer from editing", () => {
    const granted = ROLE_PERMISSION_MAP[ROLE_KEYS.VIEWER];
    expect(hasPermission(granted, PERMISSIONS.GOVERNANCE_EDIT)).toBe(false);
    expect(hasPermission(granted, PERMISSIONS.GOVERNANCE_VIEW)).toBe(true);
  });

  it("allows an organisation owner to manage members", () => {
    expect(
      hasPermission(
        ROLE_PERMISSION_MAP[ROLE_KEYS.OWNER],
        PERMISSIONS.MEMBERS_MANAGE,
      ),
    ).toBe(true);
  });

  it("does not grant organisation management to a registered manager", () => {
    expect(
      hasPermission(
        ROLE_PERMISSION_MAP[ROLE_KEYS.REGISTERED_MANAGER],
        PERMISSIONS.ORGANISATION_MANAGE,
      ),
    ).toBe(false);
  });
});
