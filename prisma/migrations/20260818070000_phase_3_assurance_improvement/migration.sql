ALTER TYPE "AssuranceLifecycleStatus" ADD VALUE 'SUSTAINED_IMPROVEMENT';

CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'ACTION_LINKED', 'NO_ACTION_REQUIRED', 'RESOLVED', 'ARCHIVED');
CREATE TYPE "RootCauseReviewStatus" AS ENUM ('DRAFT', 'COMPLETED', 'APPROVED');
CREATE TYPE "VerificationOutcome" AS ENUM ('VERIFIED', 'PARTIALLY_VERIFIED', 'FAILED');
CREATE TYPE "EffectivenessOutcome" AS ENUM ('EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'TOO_EARLY');
CREATE TYPE "RecurrenceCaseStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'CONTROLLED', 'CLOSED');
CREATE TYPE "ImprovementPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'AT_RISK', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "ExternalDependencyStatus" AS ENUM ('AWAITING_RESPONSE', 'CHASING', 'OVERDUE', 'RESOLVED', 'CANCELLED');

CREATE TABLE "Finding" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "reference" TEXT NOT NULL,
  "actionId" UUID NOT NULL,
  "sourceType" "ActionSourceType" NOT NULL,
  "sourceRecordId" UUID,
  "sourceReference" TEXT,
  "sourceUrl" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "severity" "FindingSeverity" NOT NULL,
  "clientId" UUID,
  "staffMemberId" UUID,
  "identifiedAt" TIMESTAMP(3) NOT NULL,
  "status" "FindingStatus" NOT NULL DEFAULT 'ACTION_LINKED',
  "disposition" TEXT,
  "immediateControl" TEXT,
  "createdById" UUID NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RootCauseReview" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "actionId" UUID NOT NULL,
  "method" TEXT NOT NULL,
  "problemStatement" TEXT NOT NULL,
  "immediateCauses" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "contributingFactors" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "systemCauses" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "fiveWhys" JSONB,
  "lessons" TEXT NOT NULL,
  "preventiveControls" TEXT NOT NULL,
  "status" "RootCauseReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "reviewedById" UUID NOT NULL,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RootCauseReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Verification" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "actionId" UUID NOT NULL,
  "verificationType" TEXT NOT NULL DEFAULT 'CLOSURE',
  "outcome" "VerificationOutcome" NOT NULL,
  "completedWork" TEXT NOT NULL,
  "evidenceSummary" TEXT NOT NULL,
  "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "successMeasureResult" TEXT NOT NULL,
  "independenceConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "rationale" TEXT NOT NULL,
  "verifierId" UUID NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EffectivenessReview" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "actionId" UUID NOT NULL,
  "verificationId" UUID,
  "reviewDate" TIMESTAMP(3) NOT NULL,
  "outcome" "EffectivenessOutcome" NOT NULL,
  "successMeasure" TEXT NOT NULL,
  "baseline" TEXT,
  "target" TEXT,
  "observedResult" TEXT NOT NULL,
  "recurrenceFound" BOOLEAN NOT NULL DEFAULT false,
  "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "decision" TEXT NOT NULL,
  "nextReviewDate" TIMESTAMP(3),
  "reviewerId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EffectivenessReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurrenceCase" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "reference" TEXT NOT NULL,
  "actionId" UUID NOT NULL,
  "occurrenceId" UUID,
  "detectedAt" TIMESTAMP(3) NOT NULL,
  "relatedFindingReference" TEXT,
  "narrative" TEXT NOT NULL,
  "previousControlFailure" TEXT,
  "immediateControl" TEXT NOT NULL,
  "managementEscalation" TEXT NOT NULL,
  "status" "RecurrenceCaseStatus" NOT NULL DEFAULT 'OPEN',
  "ownerId" UUID NOT NULL,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurrenceCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImprovementPlan" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "reference" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "ownerId" UUID NOT NULL,
  "successMeasures" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "baseline" TEXT,
  "target" TEXT,
  "targetDate" TIMESTAMP(3) NOT NULL,
  "status" "ImprovementPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "progressSummary" TEXT,
  "outcome" TEXT,
  "completedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImprovementPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImprovementPlanAction" (
  "planId" UUID NOT NULL,
  "actionId" UUID NOT NULL,
  CONSTRAINT "ImprovementPlanAction_pkey" PRIMARY KEY ("planId", "actionId")
);

CREATE TABLE "ExternalDependency" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "actionId" UUID NOT NULL,
  "externalPartyId" UUID,
  "partyName" TEXT NOT NULL,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "request" TEXT NOT NULL,
  "externalReference" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "lastChasedAt" TIMESTAMP(3),
  "chaseCount" INTEGER NOT NULL DEFAULT 0,
  "responseSummary" TEXT,
  "interimControl" TEXT NOT NULL,
  "escalationRoute" TEXT NOT NULL,
  "status" "ExternalDependencyStatus" NOT NULL DEFAULT 'AWAITING_RESPONSE',
  "ownerId" UUID NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalDependency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Finding_actionId_key" ON "Finding"("actionId");
CREATE UNIQUE INDEX "Finding_organisationId_reference_key" ON "Finding"("organisationId", "reference");
CREATE INDEX "Finding_organisationId_status_severity_idx" ON "Finding"("organisationId", "status", "severity");
CREATE INDEX "Finding_locationId_status_idx" ON "Finding"("locationId", "status");
CREATE INDEX "Finding_clientId_identifiedAt_idx" ON "Finding"("clientId", "identifiedAt");
CREATE UNIQUE INDEX "RootCauseReview_actionId_key" ON "RootCauseReview"("actionId");
CREATE INDEX "RootCauseReview_organisationId_status_updatedAt_idx" ON "RootCauseReview"("organisationId", "status", "updatedAt");
CREATE INDEX "RootCauseReview_locationId_status_idx" ON "RootCauseReview"("locationId", "status");
CREATE UNIQUE INDEX "Verification_actionId_verificationType_key" ON "Verification"("actionId", "verificationType");
CREATE INDEX "Verification_organisationId_outcome_verifiedAt_idx" ON "Verification"("organisationId", "outcome", "verifiedAt");
CREATE INDEX "Verification_locationId_outcome_idx" ON "Verification"("locationId", "outcome");
CREATE INDEX "EffectivenessReview_organisationId_outcome_reviewDate_idx" ON "EffectivenessReview"("organisationId", "outcome", "reviewDate");
CREATE INDEX "EffectivenessReview_actionId_reviewDate_idx" ON "EffectivenessReview"("actionId", "reviewDate");
CREATE INDEX "EffectivenessReview_locationId_reviewDate_idx" ON "EffectivenessReview"("locationId", "reviewDate");
CREATE UNIQUE INDEX "RecurrenceCase_organisationId_reference_key" ON "RecurrenceCase"("organisationId", "reference");
CREATE UNIQUE INDEX "RecurrenceCase_occurrenceId_key" ON "RecurrenceCase"("occurrenceId");
CREATE INDEX "RecurrenceCase_organisationId_status_detectedAt_idx" ON "RecurrenceCase"("organisationId", "status", "detectedAt");
CREATE INDEX "RecurrenceCase_actionId_status_idx" ON "RecurrenceCase"("actionId", "status");
CREATE INDEX "RecurrenceCase_locationId_status_idx" ON "RecurrenceCase"("locationId", "status");
CREATE UNIQUE INDEX "ImprovementPlan_organisationId_reference_key" ON "ImprovementPlan"("organisationId", "reference");
CREATE INDEX "ImprovementPlan_organisationId_status_targetDate_idx" ON "ImprovementPlan"("organisationId", "status", "targetDate");
CREATE INDEX "ImprovementPlan_locationId_status_idx" ON "ImprovementPlan"("locationId", "status");
CREATE INDEX "ImprovementPlanAction_actionId_idx" ON "ImprovementPlanAction"("actionId");
CREATE INDEX "ExternalDependency_organisationId_status_dueDate_idx" ON "ExternalDependency"("organisationId", "status", "dueDate");
CREATE INDEX "ExternalDependency_actionId_status_idx" ON "ExternalDependency"("actionId", "status");
CREATE INDEX "ExternalDependency_locationId_status_idx" ON "ExternalDependency"("locationId", "status");

ALTER TABLE "Finding" ADD CONSTRAINT "Finding_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RootCauseReview" ADD CONSTRAINT "RootCauseReview_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EffectivenessReview" ADD CONSTRAINT "EffectivenessReview_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EffectivenessReview" ADD CONSTRAINT "EffectivenessReview_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurrenceCase" ADD CONSTRAINT "RecurrenceCase_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImprovementPlanAction" ADD CONSTRAINT "ImprovementPlanAction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ImprovementPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImprovementPlanAction" ADD CONSTRAINT "ImprovementPlanAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalDependency" ADD CONSTRAINT "ExternalDependency_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Finding" (
  "id", "organisationId", "locationId", "reference", "actionId", "sourceType",
  "sourceRecordId", "sourceReference", "sourceUrl", "title", "description",
  "category", "severity", "clientId", "staffMemberId", "identifiedAt", "status",
  "createdById", "resolvedAt", "createdAt", "updatedAt"
)
SELECT
  md5(a."id"::text || ':finding')::uuid,
  a."organisationId", a."locationId", 'FND-' || a."reference", a."id", a."sourceType",
  a."sourceRecordId", a."sourceReference", a."sourceUrl", a."title", a."description",
  a."category", a."priority"::text::"FindingSeverity", a."clientId", a."staffMemberId",
  a."firstSeenAt",
  CASE WHEN a."status" = 'ARCHIVED' THEN 'ARCHIVED'::"FindingStatus"
       WHEN a."status" = 'COMPLETED' THEN 'RESOLVED'::"FindingStatus"
       ELSE 'ACTION_LINKED'::"FindingStatus" END,
  a."createdById", CASE WHEN a."status" = 'COMPLETED' THEN a."completionDate" ELSE NULL END,
  a."createdAt", a."updatedAt"
FROM "Action" a;
