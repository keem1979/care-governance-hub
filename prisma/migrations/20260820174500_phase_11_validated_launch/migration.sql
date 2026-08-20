-- Phase 11: controlled pilot evidence, launch operations, commercial intent and benchmark consent.
CREATE TYPE "LaunchPilotCohort" AS ENUM ('INTERNAL_DBAM', 'EXTERNAL_PROVIDER');
CREATE TYPE "LaunchPilotStatus" AS ENUM ('PLANNED', 'ACTIVE', 'OUTCOME_REVIEW', 'COMPLETE', 'WITHDRAWN');
CREATE TYPE "LaunchMeasureType" AS ENUM ('ACTION_CLOSURE_DAYS', 'OVERDUE_ACTION_PERCENT', 'EVIDENCE_VERIFICATION_PERCENT', 'RECURRENCE_PERCENT', 'MANAGEMENT_TIME_HOURS', 'USER_CONFIDENCE_PERCENT');
CREATE TYPE "MeasureDirection" AS ENUM ('LOWER_IS_BETTER', 'HIGHER_IS_BETTER');
CREATE TYPE "LaunchMeasureStatus" AS ENUM ('BASELINE_ONLY', 'OUTCOME_RECORDED', 'VERIFIED', 'REJECTED');
CREATE TYPE "ServiceReadinessStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'EVIDENCED', 'BLOCKED');
CREATE TYPE "CommercialIntentStatus" AS ENUM ('DISCOVERY', 'PILOT_ONLY', 'BUDGET_CONFIRMED', 'CONTRACT_REVIEW', 'READY_TO_BUY', 'DECLINED');
CREATE TYPE "BenchmarkConsentStatus" AS ENUM ('NOT_CONSIDERED', 'REQUESTED', 'APPROVED', 'DECLINED', 'WITHDRAWN');

CREATE TABLE "LaunchPilot" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cohort" "LaunchPilotCohort" NOT NULL,
    "serviceType" TEXT NOT NULL,
    "locationCount" INTEGER NOT NULL,
    "status" "LaunchPilotStatus" NOT NULL DEFAULT 'PLANNED',
    "primaryOutcome" TEXT NOT NULL,
    "successCriteria" TEXT NOT NULL,
    "riskControls" TEXT NOT NULL,
    "dataProtectionBasis" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetEndDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "ownerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LaunchPilot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaunchOutcomeMeasure" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "pilotId" UUID NOT NULL,
    "type" "LaunchMeasureType" NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "direction" "MeasureDirection" NOT NULL,
    "baselineValue" DECIMAL(18,4) NOT NULL,
    "outcomeValue" DECIMAL(18,4),
    "sampleSize" INTEGER NOT NULL,
    "measurementMethod" TEXT NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "status" "LaunchMeasureStatus" NOT NULL DEFAULT 'BASELINE_ONLY',
    "recordedById" UUID NOT NULL,
    "verifiedById" UUID,
    "verificationNote" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LaunchOutcomeMeasure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceReadinessItem" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "ServiceReadinessStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "evidenceNote" TEXT,
    "completedById" UUID,
    "evidenceId" UUID,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceReadinessItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialIntentRecord" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "pilotId" UUID NOT NULL,
    "status" "CommercialIntentStatus" NOT NULL,
    "buyerRole" TEXT NOT NULL,
    "proposedPlan" TEXT NOT NULL,
    "licenceEstimate" INTEGER NOT NULL,
    "targetDecisionDate" TIMESTAMP(3),
    "evidenceNote" TEXT NOT NULL,
    "recordedById" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommercialIntentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BenchmarkConsent" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "status" "BenchmarkConsentStatus" NOT NULL DEFAULT 'NOT_CONSIDERED',
    "permittedMetricKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minimumCohortSize" INTEGER NOT NULL DEFAULT 10,
    "dpiaReference" TEXT,
    "aggregationOnly" BOOLEAN NOT NULL DEFAULT true,
    "directIdentifiersExcluded" BOOLEAN NOT NULL DEFAULT true,
    "freeTextExcluded" BOOLEAN NOT NULL DEFAULT true,
    "requestedById" UUID,
    "requestedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BenchmarkConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LaunchPilot_organisationId_cohort_status_startDate_idx" ON "LaunchPilot"("organisationId", "cohort", "status", "startDate");
CREATE INDEX "LaunchPilot_ownerId_status_idx" ON "LaunchPilot"("ownerId", "status");
CREATE UNIQUE INDEX "LaunchOutcomeMeasure_pilotId_type_key" ON "LaunchOutcomeMeasure"("pilotId", "type");
CREATE INDEX "LaunchOutcomeMeasure_organisationId_status_type_idx" ON "LaunchOutcomeMeasure"("organisationId", "status", "type");
CREATE INDEX "LaunchOutcomeMeasure_pilotId_status_idx" ON "LaunchOutcomeMeasure"("pilotId", "status");
CREATE UNIQUE INDEX "ServiceReadinessItem_organisationId_key_key" ON "ServiceReadinessItem"("organisationId", "key");
CREATE INDEX "ServiceReadinessItem_organisationId_required_status_idx" ON "ServiceReadinessItem"("organisationId", "required", "status");
CREATE INDEX "ServiceReadinessItem_evidenceId_idx" ON "ServiceReadinessItem"("evidenceId");
CREATE UNIQUE INDEX "CommercialIntentRecord_pilotId_key" ON "CommercialIntentRecord"("pilotId");
CREATE INDEX "CommercialIntentRecord_organisationId_status_recordedAt_idx" ON "CommercialIntentRecord"("organisationId", "status", "recordedAt");
CREATE UNIQUE INDEX "BenchmarkConsent_organisationId_key" ON "BenchmarkConsent"("organisationId");
CREATE INDEX "BenchmarkConsent_status_updatedAt_idx" ON "BenchmarkConsent"("status", "updatedAt");

ALTER TABLE "LaunchPilot" ADD CONSTRAINT "LaunchPilot_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaunchPilot" ADD CONSTRAINT "LaunchPilot_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaunchPilot" ADD CONSTRAINT "LaunchPilot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaunchOutcomeMeasure" ADD CONSTRAINT "LaunchOutcomeMeasure_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaunchOutcomeMeasure" ADD CONSTRAINT "LaunchOutcomeMeasure_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "LaunchPilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LaunchOutcomeMeasure" ADD CONSTRAINT "LaunchOutcomeMeasure_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaunchOutcomeMeasure" ADD CONSTRAINT "LaunchOutcomeMeasure_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceReadinessItem" ADD CONSTRAINT "ServiceReadinessItem_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceReadinessItem" ADD CONSTRAINT "ServiceReadinessItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceReadinessItem" ADD CONSTRAINT "ServiceReadinessItem_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialIntentRecord" ADD CONSTRAINT "CommercialIntentRecord_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialIntentRecord" ADD CONSTRAINT "CommercialIntentRecord_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "LaunchPilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialIntentRecord" ADD CONSTRAINT "CommercialIntentRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BenchmarkConsent" ADD CONSTRAINT "BenchmarkConsent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BenchmarkConsent" ADD CONSTRAINT "BenchmarkConsent_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BenchmarkConsent" ADD CONSTRAINT "BenchmarkConsent_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
