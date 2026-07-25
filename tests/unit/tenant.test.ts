import { describe, expect, it } from "vitest";
import {
  assertLocationAccess,
  assertOrganisationAccess,
  TenantAccessError,
  tenantWhere,
} from "@/lib/tenant";

const scoped = {
  organisationId: "org-a",
  allLocations: false,
  locationIds: ["location-a"],
};

describe("tenant isolation", () => {
  it("rejects a cross-tenant record identifier", () => {
    expect(() => assertOrganisationAccess(scoped, "org-b")).toThrow(
      TenantAccessError,
    );
  });

  it("rejects an unassigned location", () => {
    expect(() =>
      assertLocationAccess(scoped, "org-a", "location-b"),
    ).toThrow("outside your authorised scope");
  });

  it("builds an organisation and location scoped query", () => {
    expect(tenantWhere(scoped)).toEqual({
      organisationId: "org-a",
      locationId: { in: ["location-a"] },
    });
  });

  it("allows all locations only within the active organisation", () => {
    const allLocations = { ...scoped, allLocations: true };
    expect(tenantWhere(allLocations)).toEqual({ organisationId: "org-a" });
    expect(() =>
      assertLocationAccess(allLocations, "org-b", "location-z"),
    ).toThrow(TenantAccessError);
  });
});
