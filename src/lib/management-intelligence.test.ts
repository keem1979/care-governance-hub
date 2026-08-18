import { describe, expect, it } from "vitest";
import { defaultManagementView, filterManagementQueue, parseManagementFilters, validateDelegationWindow, type ManagementQueueItem } from "@/lib/management-intelligence";

const item: ManagementQueueItem = { key: "A-1", source: "ACTION", reference: "ACT-1", title: "Review", locationId: "loc-1", locationName: "Home", ownerName: "Manager", severity: "HIGH", state: "AWAITING_VERIFICATION", reason: "Evidence requires assurance", dueAt: new Date("2026-08-01"), overdue: true, unverified: true, href: "/actions/a/assurance" };

describe("management intelligence", () => {
  it("defaults owners to an owner view and staff to their own work", () => {
    expect(defaultManagementView("organisation-owner", true)).toBe("OWNER");
    expect(defaultManagementView("staff-contributor", false)).toBe("MY_WORK");
  });

  it("rejects views and locations outside the user's scope", () => {
    expect(parseManagementFilters({ view: "OWNER", location: "outside" }, { roleKey: "registered-manager", allLocations: false, locationIds: ["loc-1"] })).toEqual({ view: "REGISTERED_MANAGER", focus: "ALL" });
  });

  it("filters the queue using assurance meaning rather than display text", () => {
    expect(filterManagementQueue([item], { view: "REGISTERED_MANAGER", focus: "UNVERIFIED" })).toHaveLength(1);
    expect(filterManagementQueue([item], { view: "REGISTERED_MANAGER", focus: "EXTERNAL" })).toHaveLength(0);
  });

  it("prevents invalid or excessive delegation periods", () => {
    expect(validateDelegationWindow(new Date("2026-08-20"), new Date("2026-08-19"))).toContain("after");
    expect(validateDelegationWindow(new Date("2026-08-20"), new Date("2028-08-20"))).toContain("one year");
  });
});
