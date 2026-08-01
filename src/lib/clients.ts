export const CLIENT_STATUSES = ["PROSPECT", "ACTIVE", "PAUSED", "ENDED", "ARCHIVED"] as const;

export function clientLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function clientName(person: { firstName: string; lastName: string; preferredName?: string | null }) {
  const given = person.preferredName?.trim() || person.firstName;
  return `${given} ${person.lastName}`.trim();
}

export function clientScopeWhere(context: {
  organisation: { id: string };
  allLocations: boolean;
  locations: { id: string }[];
}) {
  return {
    organisationId: context.organisation.id,
    archivedAt: null,
    ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id }) => id) } }] }),
  };
}

export function isAssessmentRegister(key: string) {
  return key.startsWith("assessment-");
}
