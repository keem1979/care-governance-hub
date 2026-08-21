-- Preserve historical Action-Evidence relationships and classify legacy links
-- truthfully rather than guessing their original governance purpose.
ALTER TYPE "AssuranceLifecycleStatus" ADD VALUE IF NOT EXISTS 'AWAITING_EFFECTIVENESS';
ALTER TYPE "AssuranceLifecycleStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_CLOSURE';

ALTER TABLE "ActionEvidence" ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ActionEvidence" ADD COLUMN "role" "EvidenceRole" NOT NULL DEFAULT 'LEGACY_UNSPECIFIED';
ALTER TABLE "ActionEvidence" ADD COLUMN "linkedById" UUID;
ALTER TABLE "ActionEvidence" ADD COLUMN "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ActionEvidence" ADD COLUMN "retiredById" UUID;
ALTER TABLE "ActionEvidence" ADD COLUMN "retiredAt" TIMESTAMP(3);
ALTER TABLE "ActionEvidence" ADD COLUMN "retirementReason" TEXT;
ALTER TABLE "ActionEvidence" ADD COLUMN "evidenceSnapshot" JSONB;
ALTER TABLE "ActionEvidence" DROP CONSTRAINT "ActionEvidence_pkey";
ALTER TABLE "ActionEvidence" ADD CONSTRAINT "ActionEvidence_pkey" PRIMARY KEY ("id");
DROP INDEX IF EXISTS "ActionEvidence_evidenceId_idx";
CREATE INDEX "ActionEvidence_actionId_role_retiredAt_idx" ON "ActionEvidence"("actionId", "role", "retiredAt");
CREATE INDEX "ActionEvidence_evidenceId_role_retiredAt_idx" ON "ActionEvidence"("evidenceId", "role", "retiredAt");
ALTER TABLE "ActionEvidence" DROP CONSTRAINT "ActionEvidence_evidenceId_fkey";
ALTER TABLE "ActionEvidence" ADD CONSTRAINT "ActionEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionEvidence" ADD CONSTRAINT "ActionEvidence_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionEvidence" ADD CONSTRAINT "ActionEvidence_retiredById_fkey" FOREIGN KEY ("retiredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Action" ADD COLUMN "closedById" UUID;
ALTER TABLE "Action" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "Action" ADD COLUMN "closureAssuranceRationale" TEXT;
ALTER TABLE "Action" ADD CONSTRAINT "Action_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verification decisions become append-only. The latest decision is projected
-- for workflow purposes while earlier outcomes and actors remain intact.
DROP INDEX IF EXISTS "Verification_actionId_verificationType_key";
CREATE INDEX "Verification_actionId_verificationType_verifiedAt_idx" ON "Verification"("actionId", "verificationType", "verifiedAt");

-- COMPLETED historically represented closure in QCGMS. Preserve that meaning
-- while introducing an explicit closure actor/time for future decisions.
UPDATE "Action"
SET "closedAt" = COALESCE("completionDate", "verificationDate", "updatedAt"),
    "closedById" = "verifiedById",
    "closureAssuranceRationale" = COALESCE("closureNote", "verificationRationale")
WHERE "status" = 'COMPLETED';
