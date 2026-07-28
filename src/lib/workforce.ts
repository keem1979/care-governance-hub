export const STAFF_STATUSES = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "LEFT"] as const;
export const STAFF_COMPLIANCE_TYPES = [
  "DBS",
  "RIGHT_TO_WORK",
  "VISA",
  "PROFESSIONAL_REGISTRATION",
  "TRAINING",
  "COMPETENCY",
  "SUPERVISION",
  "APPRAISAL",
  "SPOT_CHECK",
  "INFORMATION_GOVERNANCE",
  "OTHER",
] as const;
export const STAFF_COMPLIANCE_OUTCOMES = [
  "VALID",
  "PENDING",
  "COMPETENT",
  "DEVELOPMENT_REQUIRED",
  "NOT_APPLICABLE",
] as const;

export function workforceLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function workforceRecordState(
  record: { outcome: string; expiryDate?: Date | string | null; nextDueDate?: Date | string | null },
  now = new Date(),
) {
  const due = record.expiryDate ?? record.nextDueDate;
  if (due && new Date(due) < now) return "OVERDUE";
  if (record.outcome === "DEVELOPMENT_REQUIRED") return "ACTION_REQUIRED";
  if (record.outcome === "PENDING") return "PENDING";
  return "CURRENT";
}

export function daysUntil(value: Date | string, now = new Date()) {
  return Math.ceil((new Date(value).getTime() - now.getTime()) / 86_400_000);
}

export function workforceScopeWhere(context: {
  organisation: { id: string };
  allLocations: boolean;
  locations: { id: string }[];
}) {
  return {
    organisationId: context.organisation.id,
    archivedAt: null,
    ...(context.allLocations
      ? {}
      : {
          OR: [
            { locationId: null },
            { locationId: { in: context.locations.map(({ id }) => id) } },
          ],
        }),
  };
}

