export const MEMBER_STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;
export const MEMBER_ACCESS_MODES = ["STANDARD", "READ_ONLY"] as const;
export const MIN_LICENCE_SEATS = 1;
export const MAX_LICENCE_SEATS = 10_000;

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
  currentAccessMode?: string;
  nextAccessMode?: string;
  currentPermissionKeys?: string[];
  nextPermissionKeys?: string[];
  currentJobTitle?: string | null;
  nextJobTitle?: string | null;
  currentDepartment?: string | null;
  nextDepartment?: string | null;
  currentReportsToId?: string | null;
  nextReportsToId?: string | null;
  currentAllLocations?: boolean;
  nextAllLocations?: boolean;
  currentLocationIds?: string[];
  nextLocationIds?: string[];
}): void {
  const locationsChanged = [...(input.currentLocationIds ?? [])].sort().join(",") !== [...(input.nextLocationIds ?? [])].sort().join(",");
  const permissionsChanged =
    [...(input.currentPermissionKeys ?? [])].sort().join(",") !==
    [...(input.nextPermissionKeys ?? [])].sort().join(",");
  if (input.isSelf && (
    input.nextRoleKey !== input.currentRoleKey ||
    input.nextStatus !== "ACTIVE" ||
    input.currentAccessMode !== input.nextAccessMode ||
    permissionsChanged ||
    input.currentJobTitle !== input.nextJobTitle ||
    input.currentDepartment !== input.nextDepartment ||
    input.currentReportsToId !== input.nextReportsToId ||
    input.currentAllLocations !== input.nextAllLocations ||
    locationsChanged
  )) {
    throw new Error("You cannot change your own role, permissions, structure or location access.");
  }
  if (
    input.currentRoleKey === "organisation-owner" &&
    (
      input.nextRoleKey !== "organisation-owner" ||
      input.nextStatus !== "ACTIVE" ||
      input.nextAccessMode === "READ_ONLY"
    ) &&
    input.activeOwnerCount <= 1
  ) {
    throw new Error("The organisation must retain at least one active owner with standard access.");
  }
}

export function validateLicenceSeats(
  requestedSeats: number,
  activeUsers: number,
): void {
  if (
    !Number.isInteger(requestedSeats) ||
    requestedSeats < MIN_LICENCE_SEATS ||
    requestedSeats > MAX_LICENCE_SEATS
  ) {
    throw new Error(
      `Choose between ${MIN_LICENCE_SEATS} and ${MAX_LICENCE_SEATS.toLocaleString("en-GB")} licences.`,
    );
  }
  if (requestedSeats < activeUsers) {
    throw new Error(
      `You currently have ${activeUsers} active users. Remove access before reducing licences below that number.`,
    );
  }
}

export function settingLabel(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
