CREATE TYPE "CanonicalEntityType" AS ENUM ('CLIENT', 'STAFF_MEMBER', 'SERVICE_LOCATION', 'EXTERNAL_PARTY');
CREATE TYPE "ReconciliationReason" AS ENUM ('DUPLICATE_IDENTITY', 'EXTERNAL_ID_CONFLICT', 'DATA_CONFLICT', 'MISSING_IDENTITY');
CREATE TYPE "ReconciliationStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'DISTINCT_CONFIRMED', 'MERGE_ESCALATED', 'RESOLVED');
CREATE TYPE "MaterialChangeCategory" AS ENUM ('IDENTITY', 'CARE_NEED', 'RISK', 'MEDICATION_INFORMATION', 'COMMUNICATION', 'CONSENT_CAPACITY', 'SAFEGUARDING', 'WORKFORCE', 'CONTACT', 'OTHER');
CREATE TYPE "MaterialChangeSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "MaterialChangeStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'APPLIED', 'SUPERSEDED');
CREATE TYPE "DependencyReviewType" AS ENUM ('CARE_PLAN_SECTION', 'RISK_REGISTER', 'ACTION_TRACKER', 'EVIDENCE', 'STAFF_COMPETENCY', 'ASSESSMENT', 'CONTACT_RECORD', 'OTHER');
CREATE TYPE "DependencyReviewStatus" AS ENUM ('OPEN', 'APPLIED', 'DISMISSED', 'NOT_APPLICABLE');

CREATE TABLE "ExternalParty" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "partyType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalParty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalIdentifier" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "entityType" "CanonicalEntityType" NOT NULL,
  "externalId" TEXT NOT NULL,
  "recordId" UUID NOT NULL,
  "lastSeenAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalIdentifier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReconciliationCase" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "reference" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "entityType" "CanonicalEntityType" NOT NULL,
  "reason" "ReconciliationReason" NOT NULL,
  "status" "ReconciliationStatus" NOT NULL DEFAULT 'OPEN',
  "candidateRecordIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "candidateLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "matchSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "summary" TEXT NOT NULL,
  "assignedToId" UUID,
  "reviewedById" UUID,
  "canonicalRecordId" UUID,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReconciliationCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaterialChange" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "carePlanId" UUID NOT NULL,
  "carePlanVersionId" UUID NOT NULL,
  "carePlanChangeId" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "category" "MaterialChangeCategory" NOT NULL,
  "severity" "MaterialChangeSeverity" NOT NULL,
  "sectionKey" TEXT NOT NULL,
  "fieldPath" TEXT NOT NULL,
  "previousValue" JSONB,
  "proposedValue" JSONB,
  "summary" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "status" "MaterialChangeStatus" NOT NULL DEFAULT 'PROPOSED',
  "createdById" UUID NOT NULL,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DependencyReview" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "materialChangeId" UUID NOT NULL,
  "type" "DependencyReviewType" NOT NULL,
  "targetRecordId" UUID,
  "targetReference" TEXT,
  "targetTitle" TEXT NOT NULL,
  "status" "DependencyReviewStatus" NOT NULL DEFAULT 'OPEN',
  "decision" TEXT,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DependencyReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalParty_organisationId_name_idx" ON "ExternalParty"("organisationId", "name");
CREATE INDEX "ExternalParty_locationId_archivedAt_idx" ON "ExternalParty"("locationId", "archivedAt");
CREATE UNIQUE INDEX "ExternalIdentifier_organisationId_sourceSystem_entityType_externalId_key" ON "ExternalIdentifier"("organisationId", "sourceSystem", "entityType", "externalId");
CREATE UNIQUE INDEX "ExternalIdentifier_organisationId_sourceSystem_entityType_recordId_key" ON "ExternalIdentifier"("organisationId", "sourceSystem", "entityType", "recordId");
CREATE INDEX "ExternalIdentifier_organisationId_entityType_recordId_idx" ON "ExternalIdentifier"("organisationId", "entityType", "recordId");
CREATE UNIQUE INDEX "ReconciliationCase_organisationId_fingerprint_key" ON "ReconciliationCase"("organisationId", "fingerprint");
CREATE UNIQUE INDEX "ReconciliationCase_organisationId_reference_key" ON "ReconciliationCase"("organisationId", "reference");
CREATE INDEX "ReconciliationCase_organisationId_status_createdAt_idx" ON "ReconciliationCase"("organisationId", "status", "createdAt");
CREATE INDEX "ReconciliationCase_locationId_status_idx" ON "ReconciliationCase"("locationId", "status");
CREATE UNIQUE INDEX "MaterialChange_carePlanChangeId_key" ON "MaterialChange"("carePlanChangeId");
CREATE INDEX "MaterialChange_organisationId_status_severity_idx" ON "MaterialChange"("organisationId", "status", "severity");
CREATE INDEX "MaterialChange_carePlanId_carePlanVersionId_idx" ON "MaterialChange"("carePlanId", "carePlanVersionId");
CREATE INDEX "MaterialChange_clientId_status_idx" ON "MaterialChange"("clientId", "status");
CREATE UNIQUE INDEX "DependencyReview_materialChangeId_type_targetTitle_key" ON "DependencyReview"("materialChangeId", "type", "targetTitle");
CREATE INDEX "DependencyReview_organisationId_status_createdAt_idx" ON "DependencyReview"("organisationId", "status", "createdAt");
CREATE INDEX "DependencyReview_locationId_status_idx" ON "DependencyReview"("locationId", "status");
ALTER TABLE "MaterialChange" ADD CONSTRAINT "MaterialChange_carePlanChangeId_fkey" FOREIGN KEY ("carePlanChangeId") REFERENCES "CarePlanChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DependencyReview" ADD CONSTRAINT "DependencyReview_materialChangeId_fkey" FOREIGN KEY ("materialChangeId") REFERENCES "MaterialChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
