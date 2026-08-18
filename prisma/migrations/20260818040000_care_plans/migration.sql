CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'AWAITING_PERSON_AGREEMENT', 'AWAITING_CLINICAL_INFORMATION', 'AWAITING_APPROVAL', 'ACTIVE', 'ACTIVE_WITH_ACTIONS', 'REVIEW_DUE', 'REVIEW_OVERDUE', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "CarePlanVersionStatus" AS ENUM ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'RETURNED_FOR_AMENDMENT');
CREATE TYPE "CarePlanChangeType" AS ENUM ('UNCHANGED', 'ADDED', 'AMENDED', 'REMOVED', 'NEW_RISK', 'RISK_REDUCED', 'RISK_INCREASED');
CREATE TYPE "CarePlanChangeApproval" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CarePlan" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "clientId" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "currentVersionId" UUID,
  "currentVersionNumber" INTEGER NOT NULL DEFAULT 0,
  "status" "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
  "overallRisk" "RegisterRiskLevel" NOT NULL DEFAULT 'LOW',
  "effectiveDate" TIMESTAMP(3),
  "nextReviewDate" TIMESTAMP(3),
  "careCoordinatorId" UUID,
  "registeredManagerId" UUID,
  "serviceType" TEXT,
  "fundingType" TEXT,
  "localAuthorityCode" TEXT,
  "localAuthorityName" TEXT,
  "commissioner" TEXT,
  "staffAcknowledgementRequired" BOOLEAN NOT NULL DEFAULT false,
  "linkedActionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarePlanVersion" (
  "id" UUID NOT NULL,
  "carePlanId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "CarePlanVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "snapshot" JSONB NOT NULL,
  "changeSummary" JSONB,
  "assurance" JSONB,
  "reason" TEXT NOT NULL,
  "sourceReviewEntryId" UUID,
  "basedOnVersionId" UUID,
  "effectiveDate" TIMESTAMP(3),
  "nextReviewDate" TIMESTAMP(3),
  "materialSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "acknowledgementRequired" BOOLEAN NOT NULL DEFAULT false,
  "createdById" UUID NOT NULL,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarePlanVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarePlanChange" (
  "id" UUID NOT NULL,
  "versionId" UUID NOT NULL,
  "sectionKey" TEXT NOT NULL,
  "fieldPath" TEXT NOT NULL,
  "changeType" "CarePlanChangeType" NOT NULL,
  "previousValue" JSONB,
  "proposedValue" JSONB,
  "reason" TEXT NOT NULL,
  "riskImpact" "RegisterRiskLevel" NOT NULL,
  "source" TEXT NOT NULL,
  "reviewerId" UUID NOT NULL,
  "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
  "approvalStatus" "CarePlanChangeApproval" NOT NULL DEFAULT 'PENDING',
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarePlanChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarePlanVersionEvidence" (
  "versionId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  CONSTRAINT "CarePlanVersionEvidence_pkey" PRIMARY KEY ("versionId", "evidenceId")
);

CREATE TABLE "CarePlanStaffAssignment" (
  "id" UUID NOT NULL,
  "carePlanId" UUID NOT NULL,
  "staffMemberId" UUID NOT NULL,
  "requiredCompetencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarePlanStaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarePlanAcknowledgement" (
  "id" UUID NOT NULL,
  "carePlanId" UUID NOT NULL,
  "versionId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "staffMemberId" UUID,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "declaration" TEXT NOT NULL,
  CONSTRAINT "CarePlanAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarePlan_currentVersionId_key" ON "CarePlan"("currentVersionId");
CREATE UNIQUE INDEX "CarePlan_organisationId_reference_key" ON "CarePlan"("organisationId", "reference");
CREATE INDEX "CarePlan_organisationId_status_nextReviewDate_idx" ON "CarePlan"("organisationId", "status", "nextReviewDate");
CREATE INDEX "CarePlan_clientId_status_idx" ON "CarePlan"("clientId", "status");
CREATE INDEX "CarePlan_locationId_status_idx" ON "CarePlan"("locationId", "status");
CREATE UNIQUE INDEX "CarePlanVersion_carePlanId_versionNumber_key" ON "CarePlanVersion"("carePlanId", "versionNumber");
CREATE INDEX "CarePlanVersion_carePlanId_status_idx" ON "CarePlanVersion"("carePlanId", "status");
CREATE INDEX "CarePlanVersion_sourceReviewEntryId_idx" ON "CarePlanVersion"("sourceReviewEntryId");
CREATE INDEX "CarePlanChange_versionId_approvalStatus_idx" ON "CarePlanChange"("versionId", "approvalStatus");
CREATE INDEX "CarePlanVersionEvidence_evidenceId_idx" ON "CarePlanVersionEvidence"("evidenceId");
CREATE UNIQUE INDEX "CarePlanStaffAssignment_carePlanId_staffMemberId_key" ON "CarePlanStaffAssignment"("carePlanId", "staffMemberId");
CREATE INDEX "CarePlanStaffAssignment_staffMemberId_isActive_idx" ON "CarePlanStaffAssignment"("staffMemberId", "isActive");
CREATE UNIQUE INDEX "CarePlanAcknowledgement_versionId_userId_key" ON "CarePlanAcknowledgement"("versionId", "userId");
CREATE INDEX "CarePlanAcknowledgement_carePlanId_versionId_idx" ON "CarePlanAcknowledgement"("carePlanId", "versionId");
CREATE INDEX "CarePlanAcknowledgement_staffMemberId_idx" ON "CarePlanAcknowledgement"("staffMemberId");

ALTER TABLE "CarePlanVersion" ADD CONSTRAINT "CarePlanVersion_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarePlanChange" ADD CONSTRAINT "CarePlanChange_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CarePlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarePlanVersionEvidence" ADD CONSTRAINT "CarePlanVersionEvidence_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CarePlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarePlanStaffAssignment" ADD CONSTRAINT "CarePlanStaffAssignment_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarePlanAcknowledgement" ADD CONSTRAINT "CarePlanAcknowledgement_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarePlanAcknowledgement" ADD CONSTRAINT "CarePlanAcknowledgement_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CarePlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Client"
  ADD COLUMN "nhsNumber" TEXT,
  ADD COLUMN "localAuthorityCode" TEXT,
  ADD COLUMN "localAuthorityName" TEXT,
  ADD COLUMN "fundingArrangement" TEXT,
  ADD COLUMN "gpName" TEXT,
  ADD COLUMN "gpPhone" TEXT,
  ADD COLUMN "pharmacyName" TEXT,
  ADD COLUMN "pharmacyPhone" TEXT,
  ADD COLUMN "primaryDiagnoses" TEXT,
  ADD COLUMN "knownAllergies" TEXT,
  ADD COLUMN "reasonableAdjustments" TEXT,
  ADD COLUMN "communicationRequirements" TEXT;
