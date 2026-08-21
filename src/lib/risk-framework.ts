import { z } from "zod";
import type { PrismaClient, RiskLevel } from "@/generated/prisma/client";
import { ROLE_KEYS } from "@/lib/permissions";

export const RISK_APPETITE_VALUES = ["ZERO_TOLERANCE", "VERY_LOW", "LOW", "MODERATE", "OPEN"] as const;
export const RISK_CATEGORY_DEFINITIONS = [
  ["CARE_QUALITY", "Care quality"], ["CLINICAL", "Clinical"], ["SAFEGUARDING", "Safeguarding"],
  ["MEDICINES", "Medicines"], ["WORKFORCE", "Workforce"], ["OPERATIONAL", "Operational"],
  ["BUSINESS_CONTINUITY", "Business continuity"], ["FINANCIAL", "Financial"],
  ["INFORMATION_GOVERNANCE", "Information governance"], ["CYBER_SECURITY", "Cyber security"],
  ["HEALTH_AND_SAFETY", "Health and safety"], ["COMPLIANCE", "Compliance"],
  ["COMMISSIONER_CONTRACT", "Commissioner contract"], ["REPUTATIONAL", "Reputational"],
  ["STRATEGIC", "Strategic"], ["OTHER", "Other"],
] as const;

export type StableRiskCategoryKey = (typeof RISK_CATEGORY_DEFINITIONS)[number][0];

const categoryByLabel = new Map<string, StableRiskCategoryKey>(RISK_CATEGORY_DEFINITIONS.map(([key, label]) => [label, key]));
export function stableRiskCategoryKey(label: string): StableRiskCategoryKey | null {
  return categoryByLabel.get(label) ?? null;
}

export function assertFrameworkOverrideAllowed(mode:string,canOverride:boolean,rationale:string|null){
  if(mode!=="OVERRIDE_CURRENT")return;
  if(!canOverride)throw new Error("Only an authorised organisation manager may override the current Risk Framework.");
  if(!rationale||rationale.trim().length<12)throw new Error("Record a clear rationale for overriding the organisation Risk Framework.");
}

export const closureRuleSchema = z.object({
  riskLevel: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  categoryKey: z.string().trim().min(1).default("*"),
  proposerRoleKeys: z.array(z.string().trim().min(1)).min(1),
  approverRoleKeys: z.array(z.string().trim().min(1)).min(1),
  selfApprovalAllowed: z.boolean(),
  requiredApprovalCount: z.number().int().min(1).max(5),
  verifiedEvidenceRequired: z.boolean(),
  effectivenessEvidenceRequired: z.boolean(),
  escalationRequirement: z.string().trim().max(1000).nullable().optional(),
});

export const riskFrameworkDraftSchema = z.object({
  effectiveFrom: z.string().date(),
  defaultAppetite: z.enum(RISK_APPETITE_VALUES),
  defaultToleranceScore: z.number().int().min(1).max(25),
  defaultEscalation: z.string().trim().max(1000).nullable().optional(),
  changeRationale: z.string().trim().min(12).max(2000),
  categoryRules: z.array(z.object({
    categoryKey: z.enum(RISK_CATEGORY_DEFINITIONS.map(([key]) => key) as [StableRiskCategoryKey, ...StableRiskCategoryKey[]]),
    appetite: z.enum(RISK_APPETITE_VALUES), toleranceScore: z.number().int().min(1).max(25),
    escalationIndicator: z.string().trim().max(1000).nullable().optional(),
  })).default([]),
  closureRules: z.array(closureRuleSchema).length(4),
}).superRefine((value, context) => {
  const categoryKeys = value.categoryRules.map((rule) => rule.categoryKey);
  if (new Set(categoryKeys).size !== categoryKeys.length) context.addIssue({ code: "custom", path: ["categoryRules"], message: "Each category may be overridden only once." });
  const levels = value.closureRules.map((rule) => rule.riskLevel);
  const required = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
  if (new Set(levels).size !== 4 || required.some((level) => !levels.includes(level as (typeof levels)[number]))) context.addIssue({ code: "custom", path: ["closureRules"], message: "Provide exactly one closure rule for each Risk level." });
});

export type ResolvedRiskFramework = {
  frameworkVersionId: string; frameworkVersionNumber: number; ruleId: string | null;
  categoryKey: StableRiskCategoryKey; categoryLabel: string; appetite: string; toleranceScore: number;
  escalationIndicator: string | null; closurePolicyVersionId: string; closurePolicyVersionNumber: number;
};

export async function resolveCurrentRiskFramework(db: PrismaClient, organisationId: string, categoryLabel: string, at = new Date()): Promise<ResolvedRiskFramework | null> {
  const categoryKey = stableRiskCategoryKey(categoryLabel);
  if (!categoryKey) return null;
  const framework = await db.riskFrameworkVersion.findFirst({
    where: { organisationId, status: "EFFECTIVE", effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] },
    include: { rules: true, closurePolicyVersion: true }, orderBy: [{ effectiveFrom: "desc" }, { versionNumber: "desc" }],
  });
  if (!framework) return null;
  const rule = framework.rules.find((item) => item.categoryKey === categoryKey);
  return {
    frameworkVersionId: framework.id, frameworkVersionNumber: framework.versionNumber, ruleId: rule?.id ?? null,
    categoryKey, categoryLabel, appetite: rule?.appetite ?? framework.defaultAppetite,
    toleranceScore: rule?.toleranceScore ?? framework.defaultToleranceScore,
    escalationIndicator: rule?.escalationIndicator ?? framework.defaultEscalation,
    closurePolicyVersionId: framework.closurePolicyVersion.id,
    closurePolicyVersionNumber: framework.closurePolicyVersion.versionNumber,
  };
}

export type ClosureRule = z.infer<typeof closureRuleSchema> & { id?: string };

const RISK_LEVEL_ORDER: Record<RiskLevel, number> = { LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };

/** Closure authority follows the strongest exposure recorded in the Risk lifecycle.
 * A successful treatment review may reduce residual exposure, but must not also
 * downgrade the segregation of duties required to close a formerly Critical Risk.
 */
export function strongestRecordedRiskLevel(levels: RiskLevel[]): RiskLevel {
  return levels.reduce((strongest, level) =>
    RISK_LEVEL_ORDER[level] > RISK_LEVEL_ORDER[strongest] ? level : strongest,
  levels[0] ?? "LOW");
}

export function legacyClosureRule(level: RiskLevel): ClosureRule {
  const governance = [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.QUALITY_MANAGER];
  if (level === "LOW") return { riskLevel: level, categoryKey: "*", proposerRoleKeys: governance, approverRoleKeys: governance, selfApprovalAllowed: true, requiredApprovalCount: 1, verifiedEvidenceRequired: false, effectivenessEvidenceRequired: false, escalationRequirement: null };
  if (level === "MODERATE") return { riskLevel: level, categoryKey: "*", proposerRoleKeys: governance, approverRoleKeys: governance, selfApprovalAllowed: false, requiredApprovalCount: 1, verifiedEvidenceRequired: false, effectivenessEvidenceRequired: false, escalationRequirement: null };
  if (level === "HIGH") return { riskLevel: level, categoryKey: "*", proposerRoleKeys: governance, approverRoleKeys: governance, selfApprovalAllowed: false, requiredApprovalCount: 1, verifiedEvidenceRequired: true, effectivenessEvidenceRequired: true, escalationRequirement: "Registered Manager or equivalent governance review" };
  return { riskLevel: level, categoryKey: "*", proposerRoleKeys: governance, approverRoleKeys: [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.NOMINATED_INDIVIDUAL], selfApprovalAllowed: false, requiredApprovalCount: 2, verifiedEvidenceRequired: true, effectivenessEvidenceRequired: true, escalationRequirement: "Enhanced provider-level governance oversight" };
}

export async function resolveCurrentClosureRule(db: PrismaClient, organisationId: string, level: RiskLevel, categoryKey: string | null, at = new Date()) {
  const policy = await db.riskClosurePolicyVersion.findFirst({
    where: { organisationId, status: "EFFECTIVE", effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] },
    include: { rules: { where: { riskLevel: level, categoryKey: { in: [categoryKey ?? "*", "*"] } } } },
    orderBy: [{ effectiveFrom: "desc" }, { versionNumber: "desc" }],
  });
  const rule = policy?.rules.find((item) => item.categoryKey === categoryKey) ?? policy?.rules.find((item) => item.categoryKey === "*");
  return { policyVersion: policy ? { id: policy.id, versionNumber: policy.versionNumber } : null, rule: rule ?? legacyClosureRule(level) };
}

export type RiskClosureFacts = {
  actorRoleKey: string; actorId: string; ownerId: string | null; proposerId?: string;
  residualScore: number; toleranceScore: number | null; supportingEvidenceCount: number;
  verifiedCurrentEvidenceCount: number; unresolvedActionCount: number; effectivenessReviewCount: number;
  approvalCount: number;
};

export function evaluateRiskClosureConditions(rule: ClosureRule, facts: Omit<RiskClosureFacts, "actorRoleKey" | "actorId" | "proposerId" | "approvalCount">) {
  return [
    { key: "tolerance", met: facts.toleranceScore !== null && facts.residualScore <= facts.toleranceScore, reason: "A formal Risk review must bring the current residual position within the applicable tolerance." },
    { key: "actions", met: facts.unresolvedActionCount === 0, reason: "Linked treatment Actions remain unresolved." },
    { key: "evidence", met: facts.supportingEvidenceCount > 0, reason: "Sufficient appropriate closure evidence is required." },
    { key: "verified", met: !rule.verifiedEvidenceRequired || facts.verifiedCurrentEvidenceCount > 0, reason: "Current verified Evidence is required by this policy." },
    { key: "effectiveness", met: !rule.effectivenessEvidenceRequired || facts.effectivenessReviewCount > 0, reason: "Treatment effectiveness must be assessed before closure." },
  ];
}

export function evaluateRiskClosure(rule: ClosureRule, facts: RiskClosureFacts) {
  const checks = [
    { key: "role", met: rule.approverRoleKeys.includes(facts.actorRoleKey), reason: "Your current tenant role is not authorised by this closure policy." },
    { key: "self", met: rule.selfApprovalAllowed || (facts.ownerId !== facts.actorId && facts.proposerId !== facts.actorId), reason: "This policy requires separation from the Risk owner/proposer." },
    ...evaluateRiskClosureConditions(rule, facts),
  ];
  const approvalSatisfied = facts.approvalCount >= rule.requiredApprovalCount;
  return { checks, conditionsMet: checks.every((check) => check.met), approvalSatisfied, readyToClose: checks.every((check) => check.met) && approvalSatisfied, outstanding: [...checks.filter((check) => !check.met).map((check) => check.reason), ...(!approvalSatisfied ? [`${rule.requiredApprovalCount - facts.approvalCount} further authorised approval(s) required.`] : [])] };
}
