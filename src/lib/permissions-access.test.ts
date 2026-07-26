import { describe, expect, it } from "vitest";
import { applyAccessMode, PERMISSIONS } from "@/lib/permissions";

describe("membership access mode", () => {
  it("keeps selected permissions for standard access", () => {
    expect(
      applyAccessMode(
        [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT],
        "STANDARD",
      ),
    ).toEqual([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT]);
  });

  it("removes every write and administration permission in read-only mode", () => {
    expect(
      applyAccessMode(
        [
          PERMISSIONS.GOVERNANCE_VIEW,
          PERMISSIONS.GOVERNANCE_EDIT,
          PERMISSIONS.MEMBERS_MANAGE,
          PERMISSIONS.REPORTS_EXPORT,
        ],
        "READ_ONLY",
      ),
    ).toEqual([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.REPORTS_EXPORT]);
  });
});
