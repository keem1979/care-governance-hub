export const PERMISSIONS = {
  ORGANISATION_MANAGE: "organisation:manage",
  MEMBERS_MANAGE: "members:manage",
  LOCATIONS_MANAGE: "locations:manage",
  GOVERNANCE_VIEW: "governance:view",
  GOVERNANCE_EDIT: "governance:edit",
  AUDITS_COMPLETE: "audits:complete",
  ACTIONS_MANAGE: "actions:manage",
  EVIDENCE_UPLOAD: "evidence:upload",
  REPORTS_EXPORT: "reports:export",
  ASSIGNED_TASKS_EDIT: "assigned-tasks:edit",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_KEYS = {
  OWNER: "organisation-owner",
  NOMINATED_INDIVIDUAL: "nominated-individual",
  REGISTERED_MANAGER: "registered-manager",
  QUALITY_MANAGER: "quality-compliance-manager",
  AUDITOR: "auditor-consultant",
  STAFF: "staff-contributor",
  VIEWER: "read-only-viewer",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const ROLE_PERMISSION_MAP: Record<RoleKey, readonly PermissionKey[]> = {
  [ROLE_KEYS.OWNER]: Object.values(PERMISSIONS),
  [ROLE_KEYS.NOMINATED_INDIVIDUAL]: [
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  [ROLE_KEYS.REGISTERED_MANAGER]: [
    PERMISSIONS.LOCATIONS_MANAGE,
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.GOVERNANCE_EDIT,
    PERMISSIONS.AUDITS_COMPLETE,
    PERMISSIONS.ACTIONS_MANAGE,
    PERMISSIONS.EVIDENCE_UPLOAD,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  [ROLE_KEYS.QUALITY_MANAGER]: [
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.GOVERNANCE_EDIT,
    PERMISSIONS.AUDITS_COMPLETE,
    PERMISSIONS.ACTIONS_MANAGE,
    PERMISSIONS.EVIDENCE_UPLOAD,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  [ROLE_KEYS.AUDITOR]: [
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.AUDITS_COMPLETE,
    PERMISSIONS.ACTIONS_MANAGE,
    PERMISSIONS.EVIDENCE_UPLOAD,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  [ROLE_KEYS.STAFF]: [
    PERMISSIONS.EVIDENCE_UPLOAD,
    PERMISSIONS.ASSIGNED_TASKS_EDIT,
  ],
  [ROLE_KEYS.VIEWER]: [
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
  ],
};

export function hasPermission(
  granted: readonly string[],
  required: PermissionKey,
): boolean {
  return granted.includes(required);
}
