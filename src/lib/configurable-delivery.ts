import { z } from "zod";

export const UK_JURISDICTIONS = ["ENGLAND", "SCOTLAND", "WALES", "NORTHERN_IRELAND"] as const;
export const CONFIGURATION_DIGESTS = ["DAILY", "WEEKLY"] as const;

export const configurationInputSchema = z.object({
  defaultJurisdiction: z.enum(UK_JURISDICTIONS),
  actionEscalationDays: z.coerce.number().int().min(1).max(14),
  reviewLeadDays: z.coerce.number().int().min(7).max(90),
  evidenceExpiryLeadDays: z.coerce.number().int().min(7).max(90),
  defaultDigestCadence: z.enum(CONFIGURATION_DIGESTS),
  changeSummary: z.string().trim().min(12).max(500),
});

export const SAFE_CONFIGURATION_CONTROLS = {
  tenantIsolationRequired: true,
  highRiskClosureEvidenceRequired: true,
  independentVerificationRequired: true,
  humanPromotionApprovalRequired: true,
  assistantUncertaintyEscalationRequired: true,
} as const;

export type ConfigurationInput = z.infer<typeof configurationInputSchema>;
export type ConfigurationSettings = Omit<ConfigurationInput, "changeSummary"> & {
  timezone: "Europe/London";
  safetyControls: typeof SAFE_CONFIGURATION_CONTROLS;
  schemaVersion: 1;
};

export const DEFAULT_CONFIGURATION: ConfigurationSettings = {
  defaultJurisdiction: "ENGLAND",
  actionEscalationDays: 2,
  reviewLeadDays: 30,
  evidenceExpiryLeadDays: 30,
  defaultDigestCadence: "DAILY",
  timezone: "Europe/London",
  safetyControls: SAFE_CONFIGURATION_CONTROLS,
  schemaVersion: 1,
};

export function buildConfigurationSettings(input: ConfigurationInput): ConfigurationSettings {
  return {
    defaultJurisdiction: input.defaultJurisdiction,
    actionEscalationDays: input.actionEscalationDays,
    reviewLeadDays: input.reviewLeadDays,
    evidenceExpiryLeadDays: input.evidenceExpiryLeadDays,
    defaultDigestCadence: input.defaultDigestCadence,
    timezone: "Europe/London",
    safetyControls: SAFE_CONFIGURATION_CONTROLS,
    schemaVersion: 1,
  };
}

export function parseConfigurationSettings(value: unknown): ConfigurationSettings {
  const schema = z.object({
    defaultJurisdiction: z.enum(UK_JURISDICTIONS),
    actionEscalationDays: z.number().int().min(1).max(14),
    reviewLeadDays: z.number().int().min(7).max(90),
    evidenceExpiryLeadDays: z.number().int().min(7).max(90),
    defaultDigestCadence: z.enum(CONFIGURATION_DIGESTS),
    timezone: z.literal("Europe/London"),
    safetyControls: z.object({
      tenantIsolationRequired: z.literal(true),
      highRiskClosureEvidenceRequired: z.literal(true),
      independentVerificationRequired: z.literal(true),
      humanPromotionApprovalRequired: z.literal(true),
      assistantUncertaintyEscalationRequired: z.literal(true),
    }),
    schemaVersion: z.literal(1),
  });
  return schema.parse(value);
}

export const ONBOARDING_ITEMS = [
  { key: "ORGANISATION_STRUCTURE", title: "Organisation and service structure confirmed", description: "Confirm the organisation name, active locations and accountable implementation owner.", required: true },
  { key: "ACCESS_AND_REPORTING", title: "Access and reporting lines approved", description: "Check owners, Registered Managers, reporting lines, location scope and least-privilege access.", required: true },
  { key: "BRANDING_AND_DOCUMENTS", title: "Document branding verified", description: "Upload the organisation logo and check a generated policy, report and governance record.", required: true },
  { key: "SECURITY_AND_RECOVERY", title: "Security and recovery reviewed", description: "Evidence MFA review, recovery ownership, incident contacts and continuity arrangements.", required: true },
  { key: "SANDBOX_SAFETY_TEST", title: "Sandbox safety controls tested", description: "Test high-risk closure, independent verification, notification locks and Abi escalation before promotion.", required: true },
  { key: "PILOT_WORKFLOWS", title: "Pilot workflows completed", description: "Complete representative governance workflows with fictional or authorised pilot data and record user feedback.", required: true },
  { key: "MANAGEMENT_SIGN_OFF", title: "Management go-live sign-off", description: "Record the final decision, residual risks, support route and named operational owner.", required: true },
] as const;

export const implementationItemUpdateSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "BLOCKED"]),
  evidenceNote: z.string().trim().max(1000).optional().default(""),
}).superRefine((input, ctx) => {
  if (input.status === "COMPLETE" && input.evidenceNote.length < 12) {
    ctx.addIssue({ code: "custom", path: ["evidenceNote"], message: "Completed items need a meaningful evidence note of at least 12 characters." });
  }
  if (input.status === "BLOCKED" && input.evidenceNote.length < 12) {
    ctx.addIssue({ code: "custom", path: ["evidenceNote"], message: "Blocked items need a clear reason of at least 12 characters." });
  }
});

export function implementationReadiness(items: Array<{ required: boolean; status: string }>) {
  const required = items.filter((item) => item.required);
  const complete = required.filter((item) => item.status === "COMPLETE").length;
  return {
    required: required.length,
    complete,
    percentage: required.length ? Math.round((complete / required.length) * 100) : 0,
    ready: required.length > 0 && complete === required.length,
  };
}

export function assertIndependentPromotion(reviewerId: string, creatorId: string, requesterId: string) {
  if (reviewerId === creatorId || reviewerId === requesterId) {
    throw new Error("The person who created or requested this version cannot approve or reject it. A different authorised manager must review it.");
  }
}

export const NOTIFICATION_RULES = [
  { category: "CRITICAL_SAFETY", label: "Critical safety and safeguarding", description: "Immediate high-severity safety notifications. This protected channel cannot be disabled or delayed.", defaultEnabled: true, defaultCadence: "IMMEDIATE", locked: true },
  { category: "ACTION_REMINDERS", label: "Action reminders", description: "Owned actions that are overdue or approaching their due date.", defaultEnabled: true, defaultCadence: "IMMEDIATE", locked: false },
  { category: "WORKFORCE_EXPIRY", label: "Workforce expiry alerts", description: "Checks, competencies or training records approaching expiry.", defaultEnabled: true, defaultCadence: "DAILY", locked: false },
  { category: "GOVERNANCE_DEADLINES", label: "Governance deadlines", description: "Policy reviews, calendar duties, commissioner returns and other controlled deadlines.", defaultEnabled: true, defaultCadence: "DAILY", locked: false },
  { category: "ASSISTANT_ESCALATIONS", label: "Abi management escalations", description: "Uncertain, prohibited or user-flagged unsafe Abi responses requiring review.", defaultEnabled: true, defaultCadence: "IMMEDIATE", locked: false },
  { category: "PRODUCT_UPDATES", label: "Product updates", description: "Material QCGMS feature and control updates.", defaultEnabled: true, defaultCadence: "WEEKLY", locked: false },
] as const;

export type NotificationCategoryKey = typeof NOTIFICATION_RULES[number]["category"];
export type NotificationCadenceKey = "IMMEDIATE" | "DAILY" | "WEEKLY";

export const notificationPreferenceSchema = z.object({
  category: z.enum(NOTIFICATION_RULES.map((item) => item.category) as [NotificationCategoryKey, ...NotificationCategoryKey[]]),
  enabled: z.boolean(),
  cadence: z.enum(["IMMEDIATE", "DAILY", "WEEKLY"]),
}).superRefine((input, ctx) => {
  if (input.category === "CRITICAL_SAFETY" && (!input.enabled || input.cadence !== "IMMEDIATE")) {
    ctx.addIssue({ code: "custom", message: "Critical safety notifications must remain enabled and immediate." });
  }
});

export function effectiveNotificationPreferences(rows: Array<{ category: NotificationCategoryKey; enabled: boolean; cadence: NotificationCadenceKey }>, defaultDigestCadence: "DAILY" | "WEEKLY" = "DAILY") {
  const saved = new Map(rows.map((item) => [item.category, item]));
  return NOTIFICATION_RULES.map((rule) => {
    const value = saved.get(rule.category);
    return {
      ...rule,
      enabled: rule.locked ? true : value?.enabled ?? rule.defaultEnabled,
      cadence: (rule.locked ? "IMMEDIATE" : value?.cadence ?? (rule.defaultCadence === "IMMEDIATE" ? "IMMEDIATE" : defaultDigestCadence)) as NotificationCadenceKey,
    };
  });
}

export function configurationLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
