import type { CarePlanChangeType, RegisterRiskLevel } from "@/generated/prisma/client";
import type { CarePlanReviewPayload } from "@/lib/care-plan-reviews";

export const CARE_PLAN_SCHEMA_VERSION = 1;

export const CARE_PLAN_STATUSES = [
  "DRAFT", "AWAITING_PERSON_AGREEMENT", "AWAITING_CLINICAL_INFORMATION",
  "AWAITING_APPROVAL", "ACTIVE", "ACTIVE_WITH_ACTIONS", "REVIEW_DUE",
  "REVIEW_OVERDUE", "SUPERSEDED", "ARCHIVED",
] as const;

export const CARE_PLAN_DOMAINS = [
  "Physical health", "Mental health", "Medication", "Mobility", "Falls",
  "Moving and handling", "Personal care", "Continence", "Skin", "Wounds",
  "Pressure care", "Nutrition", "Hydration", "Swallowing", "Diabetes",
  "Epilepsy", "Respiratory", "PEG / enteral feeding", "Pain", "Cognition",
  "Communication", "Distress / behaviour", "Self-harm", "Suicide risk",
  "Self-neglect", "Safeguarding", "Exploitation", "Substance use", "Sleep",
  "Sensory needs", "Infection prevention", "Environmental safety", "Fire",
  "Hoarding", "Community access", "Social wellbeing", "Relationships",
  "Finances", "Equipment", "End-of-life care", "Other",
] as const;

export const CARE_PLAN_SECTIONS = [
  ["aboutMe", "About Me & what matters to me"],
  ["communication", "Communication"],
  ["capacityConsent", "Capacity, consent & decision making"],
  ["outcomes", "My outcomes"],
  ["carePackage", "My care package"],
  ["healthSummary", "Health summary"],
  ["domains", "Individual care domains"],
  ["medication", "Medication support"],
  ["deterioration", "When I become unwell"],
  ["risks", "Risk register"],
  ["safeguarding", "Safeguarding plan"],
  ["professionals", "Professional / MDT information"],
  ["implementation", "Staff implementation"],
  ["actions", "Action summary"],
  ["approval", "Review & approval"],
] as const;

export const CARE_PLAN_ASSURANCE_TESTS = [
  "Person involved", "Consent / authority clear", "Needs assessed",
  "Preferences recorded", "Outcomes identified", "Risks assessed",
  "Controls documented", "Medication responsibilities clear",
  "Clinical escalation clear", "Safeguarding considered", "Care package sufficient",
  "Required competencies identified", "Professional advice reflected",
  "Evidence linked", "Staff implementation ready", "Review date assigned",
] as const;

export type CarePlanSnapshot = {
  schemaVersion?: number;
  aboutMe?: Record<string, unknown>;
  communication?: Record<string, unknown>;
  capacityConsent?: Record<string, unknown>;
  outcomes?: unknown[];
  carePackage?: Record<string, unknown>;
  healthSummary?: Record<string, unknown>;
  domains?: unknown[];
  medication?: Record<string, unknown>;
  deterioration?: Record<string, unknown>;
  risks?: unknown[];
  safeguarding?: Record<string, unknown>;
  professionals?: Record<string, unknown>;
  implementation?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  approval?: Record<string, unknown>;
  [key: string]: unknown;
};

export type CarePlanChangeInput = {
  sectionKey: string;
  fieldPath: string;
  changeType: CarePlanChangeType;
  previousValue: unknown;
  proposedValue: unknown;
  reason: string;
  riskImpact: RegisterRiskLevel;
  source: string;
};

export function parseCarePlanSnapshot(value: unknown): CarePlanSnapshot {
  return value && typeof value === "object" && !Array.isArray(value) ? value as CarePlanSnapshot : {};
}

export function makeCarePlanReference(now = new Date(), random = Math.floor(Math.random() * 10000)) {
  return `CP-${now.getUTCFullYear()}-${String(random).padStart(4, "0")}`;
}

export function carePlanStatusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function carePlanScopeWhere(context: { organisation: { id: string }; allLocations: boolean; locations: { id: string }[] }) {
  return {
    organisationId: context.organisation.id,
    archivedAt: null,
    ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id }) => id) } }] }),
  };
}

export function compareCarePlanSnapshots(
  previous: CarePlanSnapshot,
  proposed: CarePlanSnapshot,
  meta: { reason: string; riskImpact: RegisterRiskLevel; source: string },
): CarePlanChangeInput[] {
  const keys = new Set([...Object.keys(previous), ...Object.keys(proposed)]);
  keys.delete("schemaVersion");
  return [...keys].sort().flatMap((sectionKey) => {
    const before = previous[sectionKey];
    const after = proposed[sectionKey];
    if (stable(before) === stable(after)) return [];
    let changeType: CarePlanChangeType = "AMENDED";
    if (empty(before) && !empty(after)) changeType = sectionKey === "risks" ? "NEW_RISK" : "ADDED";
    if (!empty(before) && empty(after)) changeType = "REMOVED";
    if (sectionKey === "risks" && riskScore(after) > riskScore(before)) changeType = "RISK_INCREASED";
    if (sectionKey === "risks" && riskScore(after) < riskScore(before)) changeType = "RISK_REDUCED";
    return [{ sectionKey, fieldPath: sectionKey, changeType, previousValue: before ?? null, proposedValue: after ?? null, ...meta }];
  });
}

export function validateCarePlan(input: {
  snapshot: CarePlanSnapshot; clientId: string | null; locationId: string | null;
  careCoordinatorId: string | null; registeredManagerId: string | null; nextReviewDate: string;
}) {
  if (!input.clientId) throw new Error("Choose the person this care plan belongs to.");
  if (!input.locationId) throw new Error("Choose the responsible service location.");
  if (!input.careCoordinatorId) throw new Error("Choose the accountable Care Coordinator.");
  if (!input.registeredManagerId) throw new Error("Choose the responsible Registered Manager.");
  if (!input.nextReviewDate) throw new Error("Set the next care-plan review date.");
  required(input.snapshot.aboutMe?.importantToMe, "Record what is important to the person.");
  required(input.snapshot.aboutMe?.ownWords, "Record what the person wants staff to know in their own words.");
  required(input.snapshot.communication?.staffApproach, "Record how staff should communicate with the person.");
  const domains = Array.isArray(input.snapshot.domains) ? input.snapshot.domains : [];
  for (const domain of domains) {
    if (!domain || typeof domain !== "object") continue;
    const item = domain as Record<string, unknown>;
    required(item.name, "Every selected care domain requires a name.");
    required(item.staffInstructions, `${String(item.name)} requires clear staff instructions.`);
    if (["HIGH", "CRITICAL"].includes(String(item.riskLevel))) required(item.escalationThreshold, `${String(item.name)} requires an escalation threshold.`);
  }
  const risks = Array.isArray(input.snapshot.risks) ? input.snapshot.risks : [];
  for (const risk of risks) {
    if (!risk || typeof risk !== "object") continue;
    const item = risk as Record<string, unknown>;
    required(item.title, "Every care-plan risk requires a title.");
    required(item.preventiveControls, `${String(item.title)} requires preventive controls.`);
    required(item.response, `${String(item.title)} requires a response instruction.`);
  }
}

export function validateCarePlanAssurance(snapshot: CarePlanSnapshot, decision: string) {
  const results = parseAssurance(snapshot.approval?.assurance);
  const missing = CARE_PLAN_ASSURANCE_TESTS.filter((test) => !results[test]);
  if (missing.length) throw new Error(`Complete every Care Plan Assurance test before publishing. Missing: ${missing.slice(0, 3).join(", ")}.`);
  const notMet = Object.values(results).filter((value) => value === "NOT MET").length;
  const partial = Object.values(results).filter((value) => value === "PARTIAL").length;
  if (notMet) throw new Error("Care Plan Assurance contains a NOT MET result. Return the plan for amendment or urgent review.");
  if (partial && decision === "APPROVE AND PUBLISH") throw new Error("Partial assurance results require APPROVE WITH ACTIONS and controlled follow-up.");
  if (!["APPROVE AND PUBLISH", "APPROVE WITH ACTIONS"].includes(decision)) throw new Error("Choose an approval decision before publishing.");
}

export function reviewToCarePlanSnapshot(base: CarePlanSnapshot, review: CarePlanReviewPayload): CarePlanSnapshot {
  const next = structuredClone(base);
  if (text(review.importantNow) || text(review.whatIWantStaffToKnow)) next.aboutMe = { ...(next.aboutMe ?? {}), importantToMe: text(review.importantNow) || next.aboutMe?.importantToMe, ownWords: text(review.whatIWantStaffToKnow) || next.aboutMe?.ownWords };
  if (Array.isArray(review.communicationSupport) || text(review.personComments)) next.communication = { ...(next.communication ?? {}), adjustments: review.communicationSupport ?? next.communication?.adjustments, personComments: text(review.personComments) || next.communication?.personComments };
  if (text(review.capacityOutcome) || text(review.consentPosition)) next.capacityConsent = { ...(next.capacityConsent ?? {}), latestDecisionOutcome: text(review.capacityOutcome), consentArrangements: text(review.consentPosition) };
  if (text(review.baselinePresentation) || text(review.warningSigns) || text(review.redFlags)) next.deterioration = { ...(next.deterioration ?? {}), baseline: text(review.baselinePresentation), warningSigns: text(review.warningSigns), redFlags: text(review.redFlags) };
  if (text(review.packageOverall)) next.carePackage = { ...(next.carePackage ?? {}), sufficiency: text(review.packageOverall), reviewFinding: text(review.agreedChanges) };
  if (text(review.safeguardingConcern)) next.safeguarding = { ...(next.safeguarding ?? {}), concernIdentified: text(review.safeguardingConcern), controls: text(review.safeguardingControls) };
  next.approval = { ...(next.approval ?? {}), linkedReviewReference: text(review.reference), nextReviewDate: text(review.nextReviewDate), reviewDecision: text(review.rmDecision) };
  return { ...next, schemaVersion: CARE_PLAN_SCHEMA_VERSION };
}

export function materialSectionLabels(changes: Pick<CarePlanChangeInput, "sectionKey">[]) {
  const labels = new Map<string, string>(CARE_PLAN_SECTIONS.map(([key, label]) => [key, label]));
  return [...new Set(changes.map((change) => labels.get(change.sectionKey) ?? change.sectionKey))];
}

function parseAssurance(value: unknown): Record<string, string> {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).map(([key, result]) => [key, String(result)])) : {};
}
function stable(value: unknown) { return JSON.stringify(canonical(value)); }
function canonical(value: unknown): unknown { if (Array.isArray(value)) return value.map(canonical); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])); return value ?? null; }
function empty(value: unknown) { return value == null || value === "" || (Array.isArray(value) && !value.length) || (typeof value === "object" && !Array.isArray(value) && !Object.keys(value as object).length); }
function required(value: unknown, message: string) { if (!text(value)) throw new Error(message); }
function text(value: unknown) { return String(value ?? "").trim(); }
function riskScore(value: unknown) {
  const items = Array.isArray(value) ? value : [];
  return Math.max(0, ...items.map((item) => item && typeof item === "object" ? ({ LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[String((item as Record<string, unknown>).riskLevel)] ?? 0) : 0));
}
