import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { evidenceAssuranceState } from "@/lib/evidence-assurance";
import { evidenceScopeWhere } from "@/lib/evidence";

type EvidenceContext = { organisation: { id: string }; allLocations: boolean; locations: { id: string }[] };

export async function listRiskEvidenceOptions(db: PrismaClient, context: EvidenceContext, excludeRiskId?: string) {
  const records = await db.evidence.findMany({
    where: {
      ...evidenceScopeWhere(context),
      status: "ACTIVE",
      archivedAt: null,
      ...(excludeRiskId ? { NOT: { relatedModule: "Risk", relatedRecordId: excludeRiskId } } : {}),
    },
    select: {
      id: true,
      title: true,
      category: true,
      relatedModule: true,
      sourceName: true,
      sourceReference: true,
      reviewExpiryDate: true,
      updatedAt: true,
      currentVersionId: true,
      verifications: {
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: { outcome: true, verifiedAt: true, evidenceVersionId: true, reviewDueAt: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    take: 300,
  });
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    category: record.category,
    relatedModule: record.relatedModule ?? "",
    sourceName: record.sourceName ?? "",
    sourceReference: record.sourceReference ?? "",
    assuranceState: evidenceAssuranceState({
      status: "ACTIVE",
      reviewExpiryDate: record.reviewExpiryDate,
      updatedAt: record.updatedAt,
      currentVersionId: record.currentVersionId,
      verification: record.verifications[0],
    }),
  }));
}
