export const MEMBER_STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;

export function normaliseEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function normaliseLocationCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16);
}

export function validateTemporaryPassword(value: string): void {
  if (value.length < 12 || !/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
    throw new Error("Temporary passwords need at least 12 characters with upper-case, lower-case and a number.");
  }
}

export function validateMemberAccess(input: {
  isSelf: boolean;
  currentRoleKey: string;
  nextRoleKey: string;
  nextStatus: string;
  activeOwnerCount: number;
  currentAllLocations?: boolean;
  nextAllLocations?: boolean;
  currentLocationIds?: string[];
  nextLocationIds?: string[];
}): void {
  const locationsChanged = [...(input.currentLocationIds ?? [])].sort().join(",") !== [...(input.nextLocationIds ?? [])].sort().join(",");
  if (input.isSelf && (
    input.nextRoleKey !== input.currentRoleKey ||
    input.nextStatus !== "ACTIVE" ||
    input.currentAllLocations !== input.nextAllLocations ||
    locationsChanged
  )) {
    throw new Error("You cannot change your own role, status or location access.");
  }
  if (
    input.currentRoleKey === "organisation-owner" &&
    (input.nextRoleKey !== "organisation-owner" || input.nextStatus !== "ACTIVE") &&
    input.activeOwnerCount <= 1
  ) {
    throw new Error("The organisation must retain at least one active owner.");
  }
}

export function settingLabel(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
