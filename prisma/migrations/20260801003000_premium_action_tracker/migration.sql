ALTER TYPE "ActionStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';
ALTER TYPE "ActionSourceType" ADD VALUE IF NOT EXISTS 'REGISTER';
ALTER TYPE "ActionSourceType" ADD VALUE IF NOT EXISTS 'ASSESSMENT';
ALTER TYPE "ActionSourceType" ADD VALUE IF NOT EXISTS 'INSPECTION';
ALTER TYPE "ActionSourceType" ADD VALUE IF NOT EXISTS 'KPI';
ALTER TYPE "ActionSourceType" ADD VALUE IF NOT EXISTS 'WORKFORCE';
ALTER TYPE "ActionSourceType" ADD VALUE IF NOT EXISTS 'EVIDENCE';

ALTER TABLE "Action"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Quality improvement',
  ADD COLUMN "rootCause" TEXT,
  ADD COLUMN "expectedOutcome" TEXT,
  ADD COLUMN "successMeasure" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "reviewDate" TIMESTAMP(3),
  ADD COLUMN "progressPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "escalationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "escalationReason" TEXT;

ALTER TABLE "ActionUpdate"
  ADD COLUMN "progressPercent" INTEGER,
  ADD COLUMN "nextStep" TEXT,
  ADD COLUMN "blocker" TEXT,
  ADD COLUMN "evidenceId" UUID;

CREATE INDEX "ActionUpdate_evidenceId_idx" ON "ActionUpdate"("evidenceId");
ALTER TABLE "ActionUpdate" ADD CONSTRAINT "ActionUpdate_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Action"
SET "progressPercent" = CASE
  WHEN "status" = 'COMPLETED' THEN 100
  WHEN "status" IN ('AWAITING_EVIDENCE', 'AWAITING_VERIFICATION') THEN 80
  WHEN "status" = 'IN_PROGRESS' THEN 25
  ELSE 0
END;
