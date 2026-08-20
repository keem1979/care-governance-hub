import { z } from "zod";

export const PILOT_COHORTS = ["INTERNAL_DBAM", "EXTERNAL_PROVIDER"] as const;
export const PILOT_STATUSES = ["PLANNED", "ACTIVE", "OUTCOME_REVIEW", "COMPLETE", "WITHDRAWN"] as const;
export const MEASURE_TYPES = [
  "ACTION_CLOSURE_DAYS",
  "OVERDUE_ACTION_PERCENT",
  "EVIDENCE_VERIFICATION_PERCENT",
  "RECURRENCE_PERCENT",
  "MANAGEMENT_TIME_HOURS",
  "USER_CONFIDENCE_PERCENT",
] as const;

export type MeasureType = typeof MEASURE_TYPES[number];
export type MeasureDirection = "LOWER_IS_BETTER" | "HIGHER_IS_BETTER";

export const MEASURE_DEFINITIONS: Record<MeasureType, { label: string; unit: string; direction: MeasureDirection; description: string }> = {
  ACTION_CLOSURE_DAYS: { label: "Median action-closure time", unit: "days", direction: "LOWER_IS_BETTER", description: "Median elapsed days from action creation to verified closure." },
  OVERDUE_ACTION_PERCENT: { label: "Overdue action rate", unit: "%", direction: "LOWER_IS_BETTER", description: "Overdue open actions divided by all open actions in the same observation window." },
  EVIDENCE_VERIFICATION_PERCENT: { label: "Evidence verification rate", unit: "%", direction: "HIGHER_IS_BETTER", description: "Evidence items independently verified divided by evidence items submitted in the same window." },
  RECURRENCE_PERCENT: { label: "Confirmed recurrence rate", unit: "%", direction: "LOWER_IS_BETTER", description: "Closed issues with a confirmed repeat occurrence divided by eligible closed issues." },
  MANAGEMENT_TIME_HOURS: { label: "Management administration time", unit: "hours per month", direction: "LOWER_IS_BETTER", description: "Measured monthly management time spent compiling governance assurance information." },
  USER_CONFIDENCE_PERCENT: { label: "Manager confidence score", unit: "%", direction: "HIGHER_IS_BETTER", description: "Percentage result from the same documented manager-confidence questionnaire before and after the pilot." },
};

const meaningful = z.string().trim().min(12).max(2000);
const dateOnly = z.string().date();

export const createPilotSchema = z.object({
  name: z.string().trim().min(3).max(120),
  cohort: z.enum(PILOT_COHORTS),
  serviceType: z.string().trim().min(3).max(120),
  locationCount: z.coerce.number().int().min(1).max(1000),
  primaryOutcome: meaningful.max(500),
  successCriteria: meaningful,
  riskControls: meaningful,
  dataProtectionBasis: meaningful,
  startDate: dateOnly,
  targetEndDate: dateOnly,
}).superRefine((input, ctx) => {
  if (input.targetEndDate <= input.startDate) ctx.addIssue({ code: "custom", path: ["targetEndDate"], message: "The target end date must be after the start date." });
});

export const pilotStatusSchema = z.object({ status: z.enum(PILOT_STATUSES) });

const PILOT_TRANSITIONS: Record<typeof PILOT_STATUSES[number], readonly typeof PILOT_STATUSES[number][]> = {
  PLANNED: ["ACTIVE", "WITHDRAWN"],
  ACTIVE: ["OUTCOME_REVIEW", "WITHDRAWN"],
  OUTCOME_REVIEW: ["ACTIVE", "COMPLETE", "WITHDRAWN"],
  COMPLETE: [],
  WITHDRAWN: [],
};

export function assertPilotTransition(current: string, next: string) {
  if (current === next) return;
  const allowed = PILOT_TRANSITIONS[current as keyof typeof PILOT_TRANSITIONS] ?? [];
  if (!allowed.includes(next as never)) throw new Error(`A pilot cannot move from ${label(current)} to ${label(next)}.`);
}

export const createMeasureSchema = z.object({
  type: z.enum(MEASURE_TYPES),
  baselineValue: z.coerce.number().finite().min(0).max(1_000_000),
  outcomeValue: z.union([z.coerce.number().finite().min(0).max(1_000_000), z.literal(""), z.null()]).optional(),
  sampleSize: z.coerce.number().int().min(1).max(1_000_000),
  measurementMethod: meaningful,
  evidenceReference: z.string().trim().min(3).max(500),
}).superRefine((input, ctx) => {
  const definition = MEASURE_DEFINITIONS[input.type];
  if (definition.unit === "%") {
    if (input.baselineValue > 100) ctx.addIssue({ code: "custom", path: ["baselineValue"], message: "Percentage baselines must be between 0 and 100." });
    if (typeof input.outcomeValue === "number" && input.outcomeValue > 100) ctx.addIssue({ code: "custom", path: ["outcomeValue"], message: "Percentage outcomes must be between 0 and 100." });
  }
});

export const verifyMeasureSchema = z.object({
  decision: z.enum(["VERIFIED", "REJECTED"]),
  verificationNote: meaningful,
});

export function assertIndependentMeasureVerification(recorderId: string, verifierId: string) {
  if (recorderId === verifierId) throw new Error("A different authorised manager must independently verify this outcome measure.");
}

export function measureResult(baseline: number, outcome: number | null, direction: MeasureDirection) {
  if (outcome === null) return { absoluteChange: null, percentageChange: null, improved: null };
  const absoluteChange = outcome - baseline;
  const percentageChange = baseline === 0 ? null : (absoluteChange / baseline) * 100;
  const improved = direction === "LOWER_IS_BETTER" ? outcome < baseline : outcome > baseline;
  return { absoluteChange, percentageChange, improved };
}

export const SERVICE_READINESS_ITEMS = [
  { key: "SUPPORT_AND_ESCALATION", title: "Customer support and escalation route", description: "Record service hours, urgent escalation ownership, response targets and the route customers will use.", required: true },
  { key: "SECURITY_ASSURANCE_PACK", title: "Security assurance pack", description: "Evidence the current security overview, access controls, penetration-testing position, vulnerability route and customer assurance response.", required: true },
  { key: "DATA_PROTECTION_CONTRACTS", title: "Data protection and contracts", description: "Evidence the controller/processor position, DPA, subprocessor information, retention terms and privacy contacts.", required: true },
  { key: "INCIDENT_AND_CONTINUITY", title: "Incident and continuity operations", description: "Evidence the incident playbook, notification route, recovery ownership and latest continuity or restoration exercise.", required: true },
  { key: "ONBOARDING_AND_OFFBOARDING", title: "Controlled onboarding and offboarding", description: "Evidence implementation capacity, data import safeguards, export route, access removal and exit responsibilities.", required: true },
  { key: "SERVICE_LEVELS", title: "Service levels and operational reporting", description: "Record support response targets, service-status communication, maintenance notice and service-review cadence.", required: true },
] as const;

export const serviceReadinessUpdateSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "EVIDENCED", "BLOCKED"]),
  evidenceNote: z.string().trim().max(2000).optional().default(""),
  evidenceId: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
}).superRefine((input, ctx) => {
  if (["EVIDENCED", "BLOCKED"].includes(input.status) && input.evidenceNote.length < 12) ctx.addIssue({ code: "custom", path: ["evidenceNote"], message: "Record a meaningful evidence or blocker note of at least 12 characters." });
  if (input.status === "EVIDENCED" && !input.evidenceId) ctx.addIssue({ code: "custom", path: ["evidenceId"], message: "Select current independently verified evidence before marking this control evidenced." });
});

export function serviceReadinessSummary(items: Array<{ required: boolean; status: string }>) {
  const required = items.filter((item) => item.required), evidenced = required.filter((item) => item.status === "EVIDENCED").length, blocked = required.filter((item) => item.status === "BLOCKED").length;
  return { required: required.length, evidenced, blocked, percentage: required.length ? Math.round((evidenced / required.length) * 100) : 0, ready: required.length > 0 && evidenced === required.length };
}

export const commercialIntentSchema = z.object({
  pilotId: z.string().uuid(),
  status: z.enum(["DISCOVERY", "PILOT_ONLY", "BUDGET_CONFIRMED", "CONTRACT_REVIEW", "READY_TO_BUY", "DECLINED"]),
  buyerRole: z.string().trim().min(3).max(120),
  proposedPlan: z.string().trim().min(3).max(120),
  licenceEstimate: z.coerce.number().int().min(1).max(100_000),
  targetDecisionDate: z.union([dateOnly, z.literal("")]).optional(),
  evidenceNote: meaningful,
});

const PAYING_INTENT_STATUSES = new Set(["BUDGET_CONFIRMED", "CONTRACT_REVIEW", "READY_TO_BUY"]);
export function isExternalPayingIntent(cohort: string, status: string) {
  return cohort === "EXTERNAL_PROVIDER" && PAYING_INTENT_STATUSES.has(status);
}

export const benchmarkRequestSchema = z.object({
  permittedMetricKeys: z.array(z.enum(MEASURE_TYPES)).min(1),
  minimumCohortSize: z.coerce.number().int().min(10).max(1000),
  dpiaReference: meaningful.max(500),
});

export const benchmarkReviewSchema = z.object({
  decision: z.enum(["APPROVED", "DECLINED"]),
  reviewNote: meaningful,
});

export function assertIndependentBenchmarkReview(requesterId: string | null, reviewerId: string) {
  if (!requesterId || requesterId === reviewerId) throw new Error("A different authorised manager must review the benchmarking request.");
}

export function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
