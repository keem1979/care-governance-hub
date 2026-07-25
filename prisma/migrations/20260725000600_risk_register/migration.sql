CREATE TYPE "RiskStatus" AS ENUM ('OPEN','MONITORING','TREATMENT_IN_PROGRESS','ACCEPTED','CLOSED','ARCHIVED');
CREATE TYPE "RiskLevel" AS ENUM ('LOW','MODERATE','HIGH','CRITICAL');

CREATE TABLE "Risk" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "reference" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "existingControls" TEXT NOT NULL,
  "likelihood" INTEGER NOT NULL,
  "impact" INTEGER NOT NULL,
  "initialScore" INTEGER NOT NULL,
  "initialLevel" "RiskLevel" NOT NULL,
  "furtherControls" TEXT,
  "ownerId" UUID,
  "targetDate" TIMESTAMP(3),
  "residualLikelihood" INTEGER NOT NULL,
  "residualImpact" INTEGER NOT NULL,
  "residualScore" INTEGER NOT NULL,
  "residualLevel" "RiskLevel" NOT NULL,
  "reviewFrequency" TEXT NOT NULL,
  "lastReviewDate" TIMESTAMP(3),
  "nextReviewDate" TIMESTAMP(3) NOT NULL,
  "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
  "closureRationale" TEXT,
  "closureApprovedById" UUID,
  "closureDate" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Risk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Risk_score_check" CHECK ("likelihood" BETWEEN 1 AND 5 AND "impact" BETWEEN 1 AND 5 AND "residualLikelihood" BETWEEN 1 AND 5 AND "residualImpact" BETWEEN 1 AND 5),
  CONSTRAINT "Risk_initial_score_check" CHECK ("initialScore" = "likelihood" * "impact"),
  CONSTRAINT "Risk_residual_score_check" CHECK ("residualScore" = "residualLikelihood" * "residualImpact")
);

CREATE TABLE "RiskEvidence" (
  "riskId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  CONSTRAINT "RiskEvidence_pkey" PRIMARY KEY ("riskId","evidenceId")
);

CREATE TABLE "RiskReview" (
  "id" UUID NOT NULL,
  "riskId" UUID NOT NULL,
  "reviewedById" UUID NOT NULL,
  "reviewDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT NOT NULL,
  "likelihood" INTEGER NOT NULL,
  "impact" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "level" "RiskLevel" NOT NULL,
  "controlsEffective" BOOLEAN NOT NULL,
  "nextReviewDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RiskReview_score_check" CHECK ("likelihood" BETWEEN 1 AND 5 AND "impact" BETWEEN 1 AND 5 AND "score" = "likelihood" * "impact")
);

CREATE UNIQUE INDEX "Risk_organisationId_reference_key" ON "Risk"("organisationId","reference");
CREATE INDEX "Risk_organisationId_status_residualLevel_idx" ON "Risk"("organisationId","status","residualLevel");
CREATE INDEX "Risk_organisationId_nextReviewDate_idx" ON "Risk"("organisationId","nextReviewDate");
CREATE INDEX "Risk_locationId_idx" ON "Risk"("locationId");
CREATE INDEX "RiskEvidence_evidenceId_idx" ON "RiskEvidence"("evidenceId");
CREATE INDEX "RiskReview_riskId_reviewDate_idx" ON "RiskReview"("riskId","reviewDate");

ALTER TABLE "Risk" ADD CONSTRAINT "Risk_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_closureApprovedById_fkey" FOREIGN KEY ("closureApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskEvidence" ADD CONSTRAINT "RiskEvidence_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskEvidence" ADD CONSTRAINT "RiskEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskReview" ADD CONSTRAINT "RiskReview_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskReview" ADD CONSTRAINT "RiskReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
