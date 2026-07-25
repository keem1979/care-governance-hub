export type TenantContext = {
  organisationId: string;
  allLocations: boolean;
  locationIds: readonly string[];
};

export class TenantAccessError extends Error {
  constructor(message = "The requested record is outside your authorised scope.") {
    super(message);
    this.name = "TenantAccessError";
  }
}

export function assertOrganisationAccess(
  context: TenantContext,
  recordOrganisationId: string,
): void {
  if (context.organisationId !== recordOrganisationId) {
    throw new TenantAccessError();
  }
}

export function assertLocationAccess(
  context: TenantContext,
  recordOrganisationId: string,
  locationId: string | null,
): void {
  assertOrganisationAccess(context, recordOrganisationId);
  if (
    locationId &&
    !context.allLocations &&
    !context.locationIds.includes(locationId)
  ) {
    throw new TenantAccessError(
      "The requested location is outside your authorised scope.",
    );
  }
}

export function tenantWhere(
  context: TenantContext,
  locationId?: string | null,
): { organisationId: string; locationId?: string | { in: readonly string[] } } {
  if (locationId) {
    assertLocationAccess(context, context.organisationId, locationId);
    return { organisationId: context.organisationId, locationId };
  }
  if (context.allLocations) {
    return { organisationId: context.organisationId };
  }
  return {
    organisationId: context.organisationId,
    locationId: { in: context.locationIds },
  };
}
