import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { EVIDENCE_REQUIREMENTS, type EvidenceRequirement } from "@/lib/evidence-requirements";
import { expectedCategories, INSPECTION_FRAMEWORK_VERSION } from "@/lib/inspection-framework";

type Db = PrismaClient | Prisma.TransactionClient;

export async function ensureInspectionBaseline(db: Db, organisationId: string, actorId: string) {
  const existingCount = await db.complianceRequirement.count({ where: { organisationId, catalogueKey: { not: null } } });
  if (existingCount >= EVIDENCE_REQUIREMENTS.length) return;
  for (const item of EVIDENCE_REQUIREMENTS) {
    await db.complianceRequirement.upsert({
      where: { organisationId_catalogueKey: { organisationId, catalogueKey: item.key } },
      create: baselineData(item, organisationId, actorId),
      update: {
        keyQuestion: item.keyQuestion,
        qualityStatement: item.qualityStatement,
        title: item.title,
        explanation: item.description,
        evidenceExamples: item.examples,
        frameworkVersion: INSPECTION_FRAMEWORK_VERSION,
        frameworkSourceUrl: item.sourceUrl,
        reviewFrequency: item.frequency,
        regulations: item.regulations,
        expectedEvidenceCategories: expectedCategories(item),
        serviceSpecific: Boolean(item.serviceSpecific),
      },
    });
  }
}

function baselineData(item: EvidenceRequirement, organisationId: string, actorId: string) {
  return {
    organisationId,
    catalogueKey: item.key,
    keyQuestion: item.keyQuestion,
    qualityStatement: item.qualityStatement,
    title: item.title,
    explanation: item.description,
    evidenceExamples: item.examples,
    frameworkVersion: INSPECTION_FRAMEWORK_VERSION,
    frameworkSourceUrl: item.sourceUrl,
    reviewFrequency: item.frequency,
    regulations: item.regulations,
    expectedEvidenceCategories: expectedCategories(item),
    serviceSpecific: Boolean(item.serviceSpecific),
    createdById: actorId,
  } as const;
}
