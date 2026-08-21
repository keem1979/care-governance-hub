import type { FindingSeverity } from "@/generated/prisma/client";

export type AuditAssuranceCheck = { key: string; label: string; met: boolean; reason: string };

type FindingInput = {
  severity: FindingSeverity | string;
  resolvedAt: Date | null;
  actionRequired: boolean;
  action: { closedAt: Date | null } | null;
  reaudits: { outcome: string }[];
  immediateControl?: string | null;
  escalationRequired?: boolean;
};

export function auditAssuranceReadiness(input: {
  status: string;
  mandatoryQuestionCount: number;
  mandatoryAnsweredCount: number;
  fieldworkCompletedAt: Date | null;
  findings: FindingInput[];
}) {
  const openFindings = input.findings.filter((finding) => !finding.resolvedAt);
  const unresolvedActions = input.findings.filter((finding) => finding.actionRequired && !finding.action?.closedAt);
  const materialWithoutEffectiveReaudit = input.findings.filter((finding) => {
    if (!["HIGH", "CRITICAL"].includes(finding.severity)) return false;
    return !finding.reaudits.some((review) => review.outcome === "RESOLVED");
  });
  const critical = input.findings.filter((finding) => finding.severity === "CRITICAL" && !finding.resolvedAt);
  const criticalSafetyGaps = input.findings.filter((finding) => finding.severity === "CRITICAL" && (!finding.immediateControl?.trim() || !finding.escalationRequired));
  const checks: AuditAssuranceCheck[] = [
    {
      key: "critical-safety",
      label: "Critical findings have immediate safety control and escalation",
      met: criticalSafetyGaps.length === 0,
      reason: `${criticalSafetyGaps.length} Critical finding(s) need an immediate safety control and management escalation.`,
    },
    {
      key: "mandatory-fieldwork",
      label: "Mandatory fieldwork complete",
      met: input.mandatoryQuestionCount === input.mandatoryAnsweredCount,
      reason: `${input.mandatoryQuestionCount - input.mandatoryAnsweredCount} mandatory criterion/criteria remain unanswered.`,
    },
    {
      key: "fieldwork-signoff",
      label: "Fieldwork completed and signed off",
      met: Boolean(input.fieldworkCompletedAt) || ["COMPLETED", "CLOSED", "ARCHIVED"].includes(input.status),
      reason: "Complete fieldwork review before making a governance assurance decision.",
    },
    {
      key: "actions",
      label: "Required corrective Actions closed through central assurance",
      met: unresolvedActions.length === 0,
      reason: `${unresolvedActions.length} finding(s) still require a verified canonical Action outcome.`,
    },
    {
      key: "material-reaudit",
      label: "High and Critical findings passed targeted re-audit",
      met: materialWithoutEffectiveReaudit.length === 0,
      reason: `${materialWithoutEffectiveReaudit.length} High/Critical finding(s) lack a targeted re-audit outcome of Resolved.`,
    },
    {
      key: "findings",
      label: "Every finding has an attributable resolution decision",
      met: openFindings.length === 0,
      reason: `${openFindings.length} finding(s) remain open. Action completion alone does not resolve a finding.`,
    },
    {
      key: "critical",
      label: "No unresolved Critical finding",
      met: critical.length === 0,
      reason: `${critical.length} Critical finding(s) override the percentage score and block assurance.`,
    },
  ];
  const outstanding = checks.filter((check) => !check.met);
  return { checks, outstanding, ready: outstanding.length === 0, criticalDominates: critical.length > 0 };
}

export function auditCriterionKey(templateKey: string, sectionOrder: number, questionOrder: number) {
  return `${templateKey}:S${sectionOrder}:Q${questionOrder}`;
}

export function auditDenominator(responses: Array<{ answer: string | null; score: number | null; weighting: number }>) {
  const applicable = responses.filter((item) => item.answer && item.answer !== "NOT_APPLICABLE" && item.score !== null);
  const numerator = applicable.reduce((sum, item) => sum + (item.score ?? 0) * Math.max(1, item.weighting), 0);
  const denominator = applicable.reduce((sum, item) => sum + 100 * Math.max(1, item.weighting), 0);
  return {
    applicableCount: applicable.length,
    notApplicableCount: responses.filter((item) => item.answer === "NOT_APPLICABLE").length,
    numerator,
    denominator,
    score: denominator ? Math.round((numerator / denominator) * 1000) / 10 : null,
  };
}
