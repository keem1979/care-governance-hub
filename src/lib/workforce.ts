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
export const STAFF_LEAVE_TYPES = [
  "ANNUAL", "SICKNESS", "CARERS", "DEPENDANT_EMERGENCY", "MATERNITY",
  "PATERNITY", "ADOPTION", "SHARED_PARENTAL", "PARENTAL_BEREAVEMENT",
  "COMPASSIONATE", "STUDY", "TOIL", "UNPAID", "OTHER",
] as const;
export const STAFF_LEAVE_STATUSES = ["PENDING", "APPROVED", "DECLINED", "CANCELLED"] as const;

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

export function workingDaysInclusive(start: Date | string, end: Date | string) {
  const from = new Date(start); const to = new Date(end);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to < from) return 0;
  let days = 0;
  for (const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())); cursor <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

export function leaveYearRange(startMonth: number, startDay: number, now = new Date()) {
  const month = Math.min(12, Math.max(1, startMonth)) - 1;
  const day = Math.min(31, Math.max(1, startDay));
  let start = new Date(Date.UTC(now.getUTCFullYear(), month, day));
  if (start > now) start = new Date(Date.UTC(now.getUTCFullYear() - 1, month, day));
  const end = new Date(Date.UTC(start.getUTCFullYear() + 1, month, day));
  return { start, end };
}

export function trainingMatrixState(input: { exempt?: boolean; requiredBy?: Date | string | null; expiryDate?: Date | string | null; outcome?: string | null }, now = new Date()) {
  if (input.exempt) return "NOT_REQUIRED";
  if (input.outcome === "DEVELOPMENT_REQUIRED") return "DEVELOPMENT_REQUIRED";
  if (!input.expiryDate && !input.outcome) return input.requiredBy && new Date(input.requiredBy) < now ? "OVERDUE" : "MISSING";
  if (input.expiryDate) {
    const expiry = new Date(input.expiryDate);
    if (expiry < now) return "EXPIRED";
    if (daysUntil(expiry, now) <= 30) return "DUE_SOON";
  }
  return "CURRENT";
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
