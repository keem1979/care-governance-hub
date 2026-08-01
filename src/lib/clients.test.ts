import { describe, expect, it } from "vitest";
import { clientName, clientScopeWhere, isAssessmentRegister } from "@/lib/clients";

describe("client directory helpers", () => {
  it("uses a preferred name without losing the family name", () => {
    expect(clientName({ firstName: "Alexandra", preferredName: "Alex", lastName: "Brown" })).toBe("Alex Brown");
  });
  it("limits location-scoped users", () => {
    expect(clientScopeWhere({ organisation: { id: "org" }, allLocations: false, locations: [{ id: "loc" }] })).toEqual({ organisationId: "org", archivedAt: null, OR: [{ locationId: null }, { locationId: { in: ["loc"] } }] });
  });
  it("recognises assessment records", () => expect(isAssessmentRegister("assessment-initial")).toBe(true));
});
