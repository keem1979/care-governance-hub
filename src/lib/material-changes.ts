import type { Prisma } from "@/generated/prisma/client";

type ChangeLike = {
  id: string;
  sectionKey: string;
  fieldPath: string;
  changeType: string;
  previousValue: unknown;
  proposedValue: unknown;
  reason: string;
  riskImpact: string;
};

export type ClassifiedMaterialChange = {
  category: "IDENTITY" | "CARE_NEED" | "RISK" | "MEDICATION_INFORMATION" | "COMMUNICATION" | "CONSENT_CAPACITY" | "SAFEGUARDING" | "WORKFORCE" | "CONTACT" | "OTHER";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  dependencies: Array<{ type: "CARE_PLAN_SECTION" | "RISK_REGISTER" | "ACTION_TRACKER" | "EVIDENCE" | "STAFF_COMPETENCY" | "ASSESSMENT" | "CONTACT_RECORD" | "OTHER"; title: string }>;
};

export function classifyMaterialChange(change: ChangeLike): ClassifiedMaterialChange {
  const category = categoryFor(change.sectionKey);
  const severity = severityFor(category, change.riskImpact, change.changeType);
  const label = sectionLabel(change.sectionKey);
  const dependencies: ClassifiedMaterialChange["dependencies"] = [
    { type: "CARE_PLAN_SECTION", title: `Confirm ${label} is complete in the proposed care-plan version` },
  ];
  if (category === "RISK" || category === "SAFEGUARDING") dependencies.push(
    { type: "RISK_REGISTER", title: "Review linked risk records and controls" },
    { type: "ACTION_TRACKER", title: "Confirm accountable actions and interim controls" },
  );
  if (category === "MEDICATION_INFORMATION") dependencies.push(
    { type: "EVIDENCE", title: "Confirm current medicines evidence and professional instructions" },
    { type: "STAFF_COMPETENCY", title: "Review competency requirements for assigned staff" },
  );
  if (category === "CONSENT_CAPACITY") dependencies.push(
    { type: "ASSESSMENT", title: "Review consent, capacity and decision-specific assessments" },
    { type: "EVIDENCE", title: "Confirm authority and decision evidence is current" },
  );
  if (category === "COMMUNICATION") dependencies.push(
    { type: "STAFF_COMPETENCY", title: "Confirm staff understand communication adjustments" },
  );
  if (category === "CARE_NEED" && ["HIGH", "CRITICAL"].includes(severity)) dependencies.push(
    { type: "ACTION_TRACKER", title: "Review delivery actions and interim controls" },
  );
  return {
    category,
    severity,
    summary: `${change.changeType.replaceAll("_", " ").toLowerCase()} change to ${label}`,
    dependencies,
  };
}

export async function syncMaterialChangeRecords(tx: Prisma.TransactionClient, input: {
  organisationId: string;
  locationId: string | null;
  carePlanId: string;
  carePlanVersionId: string;
  clientId: string;
  actorId: string;
}) {
  const changes = await tx.carePlanChange.findMany({ where: { versionId: input.carePlanVersionId } });
  await tx.materialChange.deleteMany({ where: { organisationId: input.organisationId, carePlanVersionId: input.carePlanVersionId } });
  for (const change of changes) {
    const classification = classifyMaterialChange(change);
    await tx.materialChange.create({
      data: {
        organisationId: input.organisationId,
        locationId: input.locationId,
        carePlanId: input.carePlanId,
        carePlanVersionId: input.carePlanVersionId,
        carePlanChangeId: change.id,
        clientId: input.clientId,
        category: classification.category,
        severity: classification.severity,
        sectionKey: change.sectionKey,
        fieldPath: change.fieldPath,
        previousValue: (change.previousValue ?? null) as Prisma.InputJsonValue,
        proposedValue: (change.proposedValue ?? null) as Prisma.InputJsonValue,
        summary: classification.summary,
        rationale: change.reason,
        createdById: input.actorId,
        dependencies: {
          create: classification.dependencies.map((dependency) => ({
            organisationId: input.organisationId,
            locationId: input.locationId,
            type: dependency.type,
            targetTitle: dependency.title,
          })),
        },
      },
    });
  }
  return changes.length;
}

function categoryFor(sectionKey: string): ClassifiedMaterialChange["category"] {
  if (sectionKey === "risks" || sectionKey === "deterioration") return "RISK";
  if (sectionKey === "medication") return "MEDICATION_INFORMATION";
  if (sectionKey === "communication") return "COMMUNICATION";
  if (sectionKey === "capacityConsent") return "CONSENT_CAPACITY";
  if (sectionKey === "safeguarding") return "SAFEGUARDING";
  if (sectionKey === "implementation") return "WORKFORCE";
  if (["aboutMe", "healthSummary", "outcomes", "carePackage", "domains", "professionals", "actions"].includes(sectionKey)) return "CARE_NEED";
  return "OTHER";
}

function severityFor(category: ClassifiedMaterialChange["category"], riskImpact: string, changeType: string): ClassifiedMaterialChange["severity"] {
  const stated = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(riskImpact) ? riskImpact as ClassifiedMaterialChange["severity"] : "MEDIUM";
  if (["MEDICATION_INFORMATION", "SAFEGUARDING", "CONSENT_CAPACITY"].includes(category) && (changeType === "REMOVED" || stated === "LOW" || stated === "MEDIUM")) return "HIGH";
  if (category === "RISK" && changeType === "RISK_INCREASED" && stated === "LOW") return "MEDIUM";
  return stated;
}

function sectionLabel(key: string) {
  return ({ aboutMe: "About Me", communication: "Communication", capacityConsent: "Capacity and consent", outcomes: "Outcomes", carePackage: "Care package", healthSummary: "Health summary", domains: "Care domains", medication: "Medication support", deterioration: "Deterioration and escalation", risks: "Risk register", safeguarding: "Safeguarding plan", professionals: "Professional information", implementation: "Staff implementation", actions: "Action summary", approval: "Review and approval" } as Record<string, string>)[key] ?? key;
}
