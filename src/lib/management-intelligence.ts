import { ROLE_KEYS } from "@/lib/permissions";

export const MANAGEMENT_VIEWS = ["REGISTERED_MANAGER", "OWNER", "LOCATION", "MY_WORK"] as const;
export const MANAGEMENT_FOCUSES = ["ALL", "CRITICAL", "OVERDUE", "UNVERIFIED", "EXTERNAL"] as const;
export const DELEGATION_RESPONSIBILITIES = [
  "ACTION_FOLLOW_UP",
  "AUDIT_PROGRAMME",
  "ASSESSMENT_REVIEW",
  "CARE_PLAN_REVIEW",
  "SPOT_CHECKS",
  "MEDICINES_ASSURANCE",
  "SAFEGUARDING_OVERSIGHT",
  "INCIDENT_REVIEW",
  "COMPLAINT_RESPONSE",
  "WORKFORCE_COMPLIANCE",
  "TRAINING_AND_COMPETENCY",
  "EVIDENCE_REVIEW",
  "RISK_REVIEW",
  "KPI_RETURN",
  "POLICY_REVIEW",
  "INSPECTION_READINESS",
  "HEALTH_AND_SAFETY",
  "INFECTION_CONTROL",
  "BUSINESS_CONTINUITY",
  "STATUTORY_NOTIFICATIONS",
  "MEETING_PREPARATION",
] as const;

export type ManagementView = (typeof MANAGEMENT_VIEWS)[number];
export type ManagementFocus = (typeof MANAGEMENT_FOCUSES)[number];
export type DelegationResponsibility = (typeof DELEGATION_RESPONSIBILITIES)[number];

export type ManagementFilters = {
  view: ManagementView;
  focus: ManagementFocus;
  locationId?: string;
};

export type ManagementQueueItem = {
  key: string;
  source: "ACTION" | "RISK" | "EXTERNAL";
  reference: string;
  title: string;
  locationId: string | null;
  locationName: string;
  ownerName: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  state: string;
  reason: string;
  dueAt: Date | null;
  overdue: boolean;
  unverified: boolean;
  href: string;
};

export function defaultManagementView(roleKey: string, allLocations: boolean): ManagementView {
  if (allLocations && [ROLE_KEYS.OWNER, ROLE_KEYS.NOMINATED_INDIVIDUAL].includes(roleKey as never)) return "OWNER";
  return "REGISTERED_MANAGER";
}

export function allowedManagementViews(roleKey: string, allLocations: boolean): ManagementView[] {
  const views: ManagementView[] = [];
  if ([ROLE_KEYS.OWNER, ROLE_KEYS.NOMINATED_INDIVIDUAL, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.QUALITY_MANAGER, ROLE_KEYS.AUDITOR, ROLE_KEYS.VIEWER].includes(roleKey as never)) {
    views.unshift("REGISTERED_MANAGER");
    views.splice(1, 0, "LOCATION");
  }
  if (allLocations && [ROLE_KEYS.OWNER, ROLE_KEYS.NOMINATED_INDIVIDUAL].includes(roleKey as never)) views.unshift("OWNER");
  if (!views.length) views.push("REGISTERED_MANAGER");
  return [...new Set(views)];
}

export function parseManagementFilters(
  query: Record<string, string | string[] | undefined>,
  options: { roleKey: string; allLocations: boolean; locationIds: readonly string[] },
): ManagementFilters {
  const views = allowedManagementViews(options.roleKey, options.allLocations);
  const requestedView = single(query.view) as ManagementView;
  const requestedFocus = single(query.focus) as ManagementFocus;
  const requestedLocation = single(query.location);
  const view = views.includes(requestedView) ? requestedView : defaultManagementView(options.roleKey, options.allLocations);
  const locationId = options.locationIds.includes(requestedLocation)
    ? requestedLocation
    : view === "LOCATION"
      ? options.locationIds[0]
      : undefined;
  return {
    view,
    focus: MANAGEMENT_FOCUSES.includes(requestedFocus) ? requestedFocus : "ALL",
    ...(locationId ? { locationId } : {}),
  };
}

export function filterManagementQueue(items: readonly ManagementQueueItem[], filters: ManagementFilters): ManagementQueueItem[] {
  return items.filter((item) => {
    if (filters.view === "LOCATION" && filters.locationId && item.locationId !== filters.locationId) return false;
    if (filters.focus === "CRITICAL") return item.severity === "CRITICAL";
    if (filters.focus === "OVERDUE") return item.overdue;
    if (filters.focus === "UNVERIFIED") return item.unverified;
    if (filters.focus === "EXTERNAL") return item.source === "EXTERNAL";
    return true;
  });
}

export function managementViewLabel(value: string): string {
  return ({
    REGISTERED_MANAGER: "Registered manager",
    OWNER: "Owner overview",
    LOCATION: "Location command",
    MY_WORK: "My work (legacy)",
  } as Record<string, string>)[value] ?? sentence(value);
}

export function managementFocusLabel(value: string): string {
  return ({ ALL: "All priorities", CRITICAL: "Critical", OVERDUE: "Overdue", UNVERIFIED: "Awaiting assurance", EXTERNAL: "External dependencies" } as Record<string, string>)[value] ?? sentence(value);
}

export function responsibilityLabel(value: string): string {
  return sentence(value);
}

export function validateDelegationWindow(startsAt: Date, endsAt: Date, now = new Date()): string | null {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return "Enter valid delegation dates.";
  if (endsAt <= startsAt) return "The delegation end must be after its start.";
  if (endsAt.getTime() - startsAt.getTime() > 366 * 24 * 60 * 60 * 1000) return "A delegation cannot run for more than one year.";
  if (endsAt < new Date(now.getTime() - 24 * 60 * 60 * 1000)) return "The delegation cannot end in the past.";
  return null;
}

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function sentence(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
