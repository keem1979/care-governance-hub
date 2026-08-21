import type { Prisma, PrismaClient, RiskLevel } from "@/generated/prisma/client";
import { ROLE_KEYS } from "@/lib/permissions";
import { resolveCurrentClosureRule, stableRiskCategoryKey } from "@/lib/risk-framework";

export const ACTION_EVIDENCE_ROLES = ["SOURCE", "COMPLETION", "VERIFICATION", "EFFECTIVENESS", "CLOSURE"] as const;
export type ActionEvidenceRole = (typeof ACTION_EVIDENCE_ROLES)[number];

const MATERIAL_SOURCES = new Set(["RISK", "INCIDENT", "SAFEGUARDING", "COMPLAINT", "AUDIT", "INSPECTION"]);

export type ActionAssurancePolicy = {
  verificationRequired: boolean;
  effectivenessRequired: boolean;
  separateVerifierRequired: boolean;
  separateCloserRequired: boolean;
  rootCauseRequired: boolean;
};

export type ActionClosureAuthority = {
  authorisedRoleKeys: string[];
  source: "PROVIDER_RISK_POLICY" | "PROVIDER_ACTION_POLICY" | "QCGMS_DEFAULT";
  policyVersionId: string | null;
  policyVersionNumber: number | null;
};

/** Technical capability and governance authority are deliberately evaluated
 * separately. A permission override may allow Action administration without
 * giving the member authority to make a provider-governed closure decision.
 */
export function evaluateActionClosureAuthority(input: {
  hasActionCapability: boolean;
  actorRoleKey: string;
  authorisedRoleKeys: readonly string[];
}) {
  const governanceAuthority = input.authorisedRoleKeys.includes(input.actorRoleKey);
  return {
    capability: input.hasActionCapability,
    governanceAuthority,
    allowed: input.hasActionCapability && governanceAuthority,
    configurationIssue: governanceAuthority && !input.hasActionCapability,
  };
}

export async function resolveActionClosureAuthority(db: PrismaClient, input: {
  organisationId: string;
  priority: string;
  sourceType: string;
  sourceRecordId: string | null;
}): Promise<ActionClosureAuthority> {
  if (input.sourceType === "RISK" && input.sourceRecordId) {
    const risk = await db.risk.findFirst({
      where: { id: input.sourceRecordId, organisationId: input.organisationId },
      select: { category: true },
    });
    if (risk) {
      const resolved = await resolveCurrentClosureRule(db, input.organisationId, input.priority as RiskLevel, stableRiskCategoryKey(risk.category));
      if (resolved.policyVersion) return {
        authorisedRoleKeys: resolved.rule.approverRoleKeys,
        source: "PROVIDER_RISK_POLICY",
        policyVersionId: resolved.policyVersion.id,
        policyVersionNumber: resolved.policyVersion.versionNumber,
      };
    }
  }
  const providerPolicy = input.sourceType === "RISK" ? null : await resolveActionAssurancePolicy(db, input);
  if (providerPolicy?.source === "PROVIDER_ACTION_POLICY") return {
    authorisedRoleKeys: providerPolicy.closureRoleKeys,
    source: providerPolicy.source,
    policyVersionId: providerPolicy.policyVersionId,
    policyVersionNumber: providerPolicy.policyVersionNumber,
  };
  return {
    authorisedRoleKeys: defaultActionClosureRoles(input.priority),
    source: "QCGMS_DEFAULT",
    policyVersionId: null,
    policyVersionNumber: null,
  };
}

export type ResolvedActionAssurancePolicy = ActionAssurancePolicy & {
  closureRoleKeys: string[];
  source: "PROVIDER_ACTION_POLICY" | "QCGMS_DEFAULT";
  policyVersionId: string | null;
  policyVersionNumber: number | null;
};

export async function resolveActionAssurancePolicy(db: PrismaClient, input: {
  organisationId: string;
  priority: string;
  sourceType: string;
}): Promise<ResolvedActionAssurancePolicy> {
  const now = new Date();
  const version = await db.actionAssurancePolicyVersion.findFirst({
    where: {
      organisationId: input.organisationId,
      status: "EFFECTIVE",
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
    },
    orderBy: [{ effectiveFrom: "desc" }, { versionNumber: "desc" }],
    include: { rules: { where: { sourceType: input.sourceType as never, priority: input.priority as never }, take: 1 } },
  });
  const rule = version?.rules[0];
  if (version && rule) return {
    verificationRequired: rule.verificationRequired,
    effectivenessRequired: rule.effectivenessRequired,
    separateVerifierRequired: rule.separateVerifierRequired,
    separateCloserRequired: rule.separateCloserRequired,
    rootCauseRequired: rule.rootCauseRequired,
    closureRoleKeys: rule.closureRoleKeys,
    source: "PROVIDER_ACTION_POLICY",
    policyVersionId: version.id,
    policyVersionNumber: version.versionNumber,
  };
  return {
    ...actionAssurancePolicy(input.priority, input.sourceType),
    closureRoleKeys: defaultActionClosureRoles(input.priority),
    source: "QCGMS_DEFAULT",
    policyVersionId: null,
    policyVersionNumber: null,
  };
}

function defaultActionClosureRoles(priority: string) {
  if (priority === "LOW") return Object.values(ROLE_KEYS);
  if (priority === "CRITICAL") return [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.NOMINATED_INDIVIDUAL];
  return [ROLE_KEYS.OWNER, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.QUALITY_MANAGER, ROLE_KEYS.NOMINATED_INDIVIDUAL];
}

export function actionAssurancePolicy(priority: string, sourceType: string): ActionAssurancePolicy {
  const high = priority === "HIGH" || priority === "CRITICAL";
  const materialSource = MATERIAL_SOURCES.has(sourceType);
  return {
    verificationRequired: priority !== "LOW" || materialSource,
    effectivenessRequired: high || (priority === "MEDIUM" && materialSource),
    separateVerifierRequired: high,
    separateCloserRequired: high,
    rootCauseRequired: high,
  };
}

export type ActionAssuranceCheck = { key: string; label: string; met: boolean; reason: string };

export function actionAssuranceReadiness(input: {
  priority: string;
  sourceType: string;
  progressPercent: number;
  completionDate: Date | null;
  ownerId: string;
  closerId?: string | null;
  verification: { outcome: string; verifierId: string } | null;
  effectiveness: { outcome: string; recurrenceFound: boolean } | null;
  roleCounts: Partial<Record<string, number>>;
  unresolvedDependencies: number;
  rootCauseComplete: boolean;
  policy?: ActionAssurancePolicy;
}) {
  const policy = input.policy ?? actionAssurancePolicy(input.priority, input.sourceType);
  const count = (role: string) => input.roleCounts[role] ?? 0;
  const checks: ActionAssuranceCheck[] = [
    { key: "work", label: "Required work recorded complete", met: input.progressPercent === 100 && Boolean(input.completionDate), reason: "Record 100% progress and the completion date before closure." },
    { key: "completion-evidence", label: "Completion evidence linked", met: count("COMPLETION") > 0, reason: "Link evidence showing that the required work was completed." },
    { key: "dependencies", label: "No unresolved external dependency", met: input.unresolvedDependencies === 0, reason: `${input.unresolvedDependencies} external dependenc${input.unresolvedDependencies === 1 ? "y remains" : "ies remain"} unresolved.` },
  ];
  if (policy.rootCauseRequired) checks.push({ key: "root-cause", label: "Root-cause review complete", met: input.rootCauseComplete, reason: "Complete and approve the structured root-cause review." });
  if (policy.verificationRequired) {
    checks.push({ key: "verification", label: "Completion verified", met: input.verification?.outcome === "VERIFIED", reason: input.verification?.outcome === "FAILED" ? "Completion verification was not accepted. Further action or evidence is required before a new verification decision." : "An authorised person must verify the work against its success measure." });
    checks.push({ key: "verification-evidence", label: "Verification evidence linked", met: count("VERIFICATION") > 0, reason: "Classify at least one linked record as Verification evidence." });
  }
  if (policy.separateVerifierRequired) checks.push({ key: "separate-verifier", label: "Verifier is separate from delivery owner", met: Boolean(input.verification && input.verification.verifierId !== input.ownerId), reason: "High and Critical Actions cannot be self-verified by the delivery owner." });
  if (policy.effectivenessRequired) {
    checks.push({ key: "effectiveness", label: "Effectiveness demonstrated", met: input.effectiveness?.outcome === "EFFECTIVE" && !input.effectiveness.recurrenceFound, reason: "Record an Effective outcome after observing whether the change worked." });
    checks.push({ key: "effectiveness-evidence", label: "Effectiveness evidence linked", met: count("EFFECTIVENESS") > 0, reason: "Link evidence showing the result after implementation, not only that activity occurred." });
  }
  checks.push({ key: "closure-evidence", label: "Closure evidence identified", met: count("CLOSURE") > 0, reason: "Identify the evidence relied on for the closure decision." });
  if (policy.separateCloserRequired && input.closerId) {
    checks.push({ key: "separate-closer", label: "Closer is separate from owner and verifier", met: input.closerId !== input.ownerId && input.closerId !== input.verification?.verifierId, reason: "High and Critical Actions require a separate authorised closure decision." });
  }
  const outstanding = checks.filter((check) => !check.met);
  return { policy, checks, outstanding, ready: outstanding.length === 0 };
}

export async function linkActionEvidence(tx: Prisma.TransactionClient, input: {
  actionId: string;
  organisationId: string;
  evidenceIds: string[];
  role: ActionEvidenceRole;
  actorId: string;
}) {
  const ids = [...new Set(input.evidenceIds.filter(Boolean))];
  if (!ids.length) return;
  const evidence = await tx.evidence.findMany({
    where: { id: { in: ids }, organisationId: input.organisationId },
    select: { id: true, title: true, currentVersionId: true, taxonomyFamilyKey: true, taxonomyTypeKey: true, category: true, evidenceType: true },
  });
  if (evidence.length !== ids.length) throw new Error("One or more Evidence records are outside this organisation or no longer available.");
  const existing = new Set((await tx.actionEvidence.findMany({ where: { actionId: input.actionId, evidenceId: { in: ids }, role: input.role, retiredAt: null }, select: { evidenceId: true } })).map((item) => item.evidenceId));
  const records = evidence.filter((item) => !existing.has(item.id));
  if (!records.length) return;
  await tx.actionEvidence.createMany({ data: records.map((item) => ({ actionId: input.actionId, evidenceId: item.id, role: input.role, linkedById: input.actorId, evidenceSnapshot: { title: item.title, currentVersionId: item.currentVersionId, taxonomyFamilyKey: item.taxonomyFamilyKey, taxonomyTypeKey: item.taxonomyTypeKey, category: item.category, evidenceType: item.evidenceType } })) });
}

export function evidenceRoleLabel(role: string) {
  return role === "LEGACY_UNSPECIFIED" ? "Legacy supporting evidence" : role.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
