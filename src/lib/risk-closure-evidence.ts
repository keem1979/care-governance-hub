import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { evidenceAssuranceState } from "@/lib/evidence-assurance";
import { evidenceScopeWhere } from "@/lib/evidence";

type EvidenceContext = { organisation: { id: string }; allLocations: boolean; locations: { id: string }[] };

export async function riskClosureEvidenceSummary(db: PrismaClient, context: EvidenceContext, evidenceIds: string[]) {
  if (!evidenceIds.length) return { supportingEvidenceCount: 0, verifiedCurrentEvidenceCount: 0 };
  const records = await db.evidence.findMany({
    where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context), status: "ACTIVE", archivedAt: null },
    select: {
      status: true, reviewExpiryDate: true, updatedAt: true, currentVersionId: true,
      verifications: { orderBy: { verifiedAt: "desc" }, take: 1, select: { outcome: true, verifiedAt: true, evidenceVersionId: true, reviewDueAt: true } },
    },
  });
  return {
    supportingEvidenceCount: records.length,
    verifiedCurrentEvidenceCount: records.filter((record) => ["CURRENT_VERIFIED", "VERIFIED_WITH_LIMITATIONS", "EXPIRING_SOON"].includes(evidenceAssuranceState({ status: record.status, reviewExpiryDate: record.reviewExpiryDate, updatedAt: record.updatedAt, currentVersionId: record.currentVersionId, verification: record.verifications[0] }))).length,
  };
}
