import { auditEvidenceRequirementKeys, auditKeyFromEvidenceTags } from "@/lib/audit-evidence";
import { registerEvidenceRequirementKey, registerKeyFromEvidenceTags } from "@/lib/register-evidence";

type EvidenceLike = { title: string; category: string; tags: readonly string[]; relatedModule: string | null; relatedRecordId: string | null };

const POLICY_REQUIREMENTS: Record<string, string[]> = {
  safeguarding: ["safe-safeguarding-policy"],
  medicines: ["safe-medicines-policy"],
  "infection-control": ["safe-infection-control"],
  "moving-handling": ["safe-moving-handling"],
  "safer-recruitment": ["safe-recruitment-files", "safe-dbs", "safe-right-work"],
  "dbs-right-work": ["safe-dbs", "safe-right-work"],
  whistleblowing: ["safe-whistleblowing", "well-staff-feedback"],
  complaints: ["responsive-complaints"],
  "accessible-information": ["caring-communication", "responsive-service-information"],
  "end-of-life": ["responsive-end-life"],
  "business-continuity": ["well-business-continuity"],
  "data-protection": ["well-data-protection", "well-record-retention"],
  "information-security": ["well-access-security"],
  "quality-governance": ["well-policy-control", "well-governance-minutes", "well-kpis"],
  "audit-improvement": ["well-audit-programme", "well-actions"],
  notifications: ["safe-cqc-notifications", "well-pir"],
  "service-continuity": ["effective-transitions", "responsive-referrals"],
  "working-partnership": ["well-partner-feedback"],
  "delegated-healthcare": ["effective-delegated-healthcare"],
  dignity: ["caring-dignity"],
  consent: ["effective-consent", "caring-involvement"],
};

export function policyRequirementKeys(templateKey: string | undefined, title = ""): string[] {
  const direct = templateKey ? POLICY_REQUIREMENTS[templateKey] : undefined;
  if (direct) return direct;
  const text = `${templateKey ?? ""} ${title}`.toLowerCase();
  return Object.entries(POLICY_REQUIREMENTS).filter(([key]) => text.includes(key)).flatMap(([, keys]) => keys);
}

export function evidenceRequirementKeys(item: EvidenceLike): string[] {
  const tagged = item.tags.filter((tag) => tag.startsWith("requirement:")).map((tag) => tag.slice("requirement:".length));
  if (tagged.length) return [...new Set(tagged)];
  if (item.relatedModule === "EvidenceRequirement" && item.relatedRecordId) return [item.relatedRecordId];
  if (item.relatedModule === "Audit") return auditEvidenceRequirementKeys(auditKeyFromEvidenceTags(item.tags) ?? "");
  if (item.relatedModule === "RegisterEntry") {
    const key = registerEvidenceRequirementKey(registerKeyFromEvidenceTags(item.tags) ?? "");
    return key ? [key] : [];
  }
  if (item.relatedModule === "Risk") return ["well-risk-register"];
  if (item.relatedModule === "Action") return ["well-actions"];
  if (item.relatedModule === "GovernanceMeeting") return ["well-governance-minutes"];
  if (item.relatedModule === "WorkforceTrainingMatrix") return ["effective-training-matrix", "effective-competency-matrix"];
  if (item.relatedModule === "Policy") return policyRequirementKeys(item.tags.find((tag) => tag.startsWith("policy-template:"))?.slice(16), item.title);
  return [];
}

export function evidenceCategoriesFor(item: EvidenceLike): string[] {
  const text = `${item.title} ${item.category} ${item.tags.join(" ")}`.toLowerCase();
  const result = new Set<string>(["PROCESSES"]);
  if (/feedback|complaint|compliment|survey|experience|advocacy|involvement|outcome/.test(text)) result.add("PEOPLES_EXPERIENCE");
  if (/staff|workforce|training|supervision|appraisal|speak|whistle/.test(text)) result.add("STAFF_AND_LEADER_FEEDBACK");
  if (/partner|commission|professional|referral|transition|safeguard/.test(text)) result.add("PARTNER_FEEDBACK");
  if (/observation|spot.check|audit|environment|competenc/.test(text)) result.add("OBSERVATION");
  if (/outcome|kpi|improvement|action|trend|performance/.test(text)) result.add("OUTCOMES");
  return [...result];
}
