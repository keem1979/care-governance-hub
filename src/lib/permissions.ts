export const PERMISSIONS = {
  ORGANISATION_MANAGE: "organisation:manage",
  MEMBERS_MANAGE: "members:manage",
  LOCATIONS_MANAGE: "locations:manage",
  GOVERNANCE_VIEW: "governance:view",
  GOVERNANCE_EDIT: "governance:edit",
  AUDITS_COMPLETE: "audits:complete",
  ACTIONS_MANAGE: "actions:manage",
  EVIDENCE_UPLOAD: "evidence:upload",
  CONTROLS_MANAGE: "controls:manage",
  REPORTS_EXPORT: "reports:export",
  ASSIGNED_TASKS_EDIT: "assigned-tasks:edit",
  WORKFORCE_VIEW: "workforce:view",
  WORKFORCE_MANAGE: "workforce:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_GROUPS: Array<{
  name: string;
  description: string;
  items: Array<{ key: PermissionKey; label: string; detail: string }>;
}> = [
  {
    name: "Page access",
    description: "Controls whether the user can open governance pages and reports.",
    items: [
      {
        key: PERMISSIONS.GOVERNANCE_VIEW,
        label: "Governance pages",
        detail: "Open the dashboard and governance modules for assigned locations.",
      },
      {
        key: PERMISSIONS.REPORTS_EXPORT,
        label: "Reports and exports",
        detail: "Open reports and download authorised records.",
      },
    ],
  },
  {
    name: "Create and update records",
    description: "Controls the work this user can complete after opening a page.",
    items: [
      {
        key: PERMISSIONS.GOVERNANCE_EDIT,
        label: "Governance records",
        detail: "Add and update policies, registers, risks, meetings, calendar entries, KPIs and templates.",
      },
      {
        key: PERMISSIONS.AUDITS_COMPLETE,
        label: "Audits",
        detail: "Start audits, record responses and complete findings.",
      },
      {
        key: PERMISSIONS.ACTIONS_MANAGE,
        label: "Actions",
        detail: "Create, assign, update and close actions.",
      },
      {
        key: PERMISSIONS.EVIDENCE_UPLOAD,
        label: "Evidence",
        detail: "Upload evidence and add controlled versions.",
      },
      {
        key: PERMISSIONS.CONTROLS_MANAGE,
        label: "Provider controls",
        detail: "Create and govern provider-confirmed controls for authorised locations.",
      },
      {
        key: PERMISSIONS.ASSIGNED_TASKS_EDIT,
        label: "Assigned work",
        detail: "Update work specifically assigned to this user.",
      },
      {
        key: PERMISSIONS.WORKFORCE_VIEW,
        label: "Workforce compliance",
        detail: "View authorised staff compliance, training and competency records.",
      },
      {
        key: PERMISSIONS.WORKFORCE_MANAGE,
        label: "Manage workforce compliance",
        detail: "Add and update staff compliance, training, supervision and competency records.",
      },
    ],
  },
  {
    name: "Administration",
    description: "Keep these permissions limited to trusted administrators.",
    items: [
      {
        key: PERMISSIONS.ORGANISATION_MANAGE,
        label: "Organisation settings",
        detail: "Change organisation details and licence settings.",
      },
      {
        key: PERMISSIONS.MEMBERS_MANAGE,
        label: "Users and permissions",
        detail: "Add users, remove access and assign roles and permissions.",
      },
      {
        key: PERMISSIONS.LOCATIONS_MANAGE,
        label: "Service locations",
        detail: "Add, update, archive and restore locations.",
      },
    ],
  },
];

const READ_ONLY_PERMISSIONS = new Set<PermissionKey>([
  PERMISSIONS.GOVERNANCE_VIEW,
  PERMISSIONS.REPORTS_EXPORT,
  PERMISSIONS.WORKFORCE_VIEW,
]);

export function applyAccessMode(
  permissions: readonly string[],
  accessMode: "STANDARD" | "READ_ONLY",
): string[] {
  const unique = [...new Set(permissions)];
  if (accessMode === "STANDARD") return unique;
  return unique.filter((key) => READ_ONLY_PERMISSIONS.has(key as PermissionKey));
}

export function permissionLabel(key: string): string {
  return (
    PERMISSION_GROUPS.flatMap(({ items }) => items).find(
      (item) => item.key === key,
    )?.label ??
    key.replaceAll(":", " ").replaceAll("-", " ")
  );
}

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
    PERMISSIONS.WORKFORCE_VIEW,
  ],
  [ROLE_KEYS.REGISTERED_MANAGER]: [
    PERMISSIONS.LOCATIONS_MANAGE,
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.GOVERNANCE_EDIT,
    PERMISSIONS.AUDITS_COMPLETE,
    PERMISSIONS.ACTIONS_MANAGE,
    PERMISSIONS.EVIDENCE_UPLOAD,
    PERMISSIONS.CONTROLS_MANAGE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.WORKFORCE_VIEW,
    PERMISSIONS.WORKFORCE_MANAGE,
  ],
  [ROLE_KEYS.QUALITY_MANAGER]: [
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.GOVERNANCE_EDIT,
    PERMISSIONS.AUDITS_COMPLETE,
    PERMISSIONS.ACTIONS_MANAGE,
    PERMISSIONS.EVIDENCE_UPLOAD,
    PERMISSIONS.CONTROLS_MANAGE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.WORKFORCE_VIEW,
    PERMISSIONS.WORKFORCE_MANAGE,
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
