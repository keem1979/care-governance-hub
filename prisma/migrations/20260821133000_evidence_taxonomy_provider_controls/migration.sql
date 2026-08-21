-- Evidence taxonomy, relationship roles and provider-confirmed control assurance.
-- Existing Evidence category/type strings remain unchanged and structured taxonomy fields stay null.
CREATE TYPE "EvidenceRole" AS ENUM ('LEGACY_UNSPECIFIED', 'SOURCE', 'CONTROL', 'COMPLETION', 'VERIFICATION', 'EFFECTIVENESS', 'CLOSURE', 'PROFESSIONAL', 'REGULATORY', 'SUPPORTING');
CREATE TYPE "EvidenceCurrentnessMode" AS ENUM ('HISTORICAL_NON_EXPIRING', 'EXPIRY_BASED', 'REVIEW_BASED', 'SUPERSESSION_BASED', 'CURRENT_SOURCE');
CREATE TYPE "EvidenceCurrentnessStatus" AS ENUM ('CURRENT', 'SUPERSEDED', 'HISTORICAL');
CREATE TYPE "ProviderEvidenceTypeStatus" AS ENUM ('ACTIVE', 'RETIRED');
CREATE TYPE "ProviderControlFamily" AS ENUM ('PEOPLE', 'PROCESS', 'TECHNOLOGY', 'PROFESSIONAL_EXTERNAL', 'PHYSICAL_ENVIRONMENTAL', 'GOVERNANCE');
CREATE TYPE "ProviderControlVersionStatus" AS ENUM ('DRAFT', 'EFFECTIVE', 'SUPERSEDED', 'RETIRED');
CREATE TYPE "ProviderControlScopeType" AS ENUM ('ORGANISATION', 'SELECTED_LOCATIONS');
CREATE TYPE "RiskControlApplicationStatus" AS ENUM ('APPLIED', 'REVIEW_REQUIRED', 'NO_LONGER_APPLICABLE');
ALTER TYPE "EffectivenessOutcome" ADD VALUE 'INSUFFICIENT_EVIDENCE';

ALTER TABLE "Evidence"
  ADD COLUMN "taxonomyFamilyKey" TEXT,
  ADD COLUMN "taxonomyTypeKey" TEXT,
  ADD COLUMN "taxonomyFamilySnapshot" TEXT,
  ADD COLUMN "taxonomyTypeSnapshot" TEXT,
  ADD COLUMN "providerEvidenceTypeId" UUID,
  ADD COLUMN "currentnessMode" "EvidenceCurrentnessMode",
  ADD COLUMN "currentnessStatus" "EvidenceCurrentnessStatus";

ALTER TABLE "RiskEvidence" ADD COLUMN "role" "EvidenceRole" NOT NULL DEFAULT 'LEGACY_UNSPECIFIED';
ALTER TABLE "RiskEvidence" DROP CONSTRAINT "RiskEvidence_pkey";
ALTER TABLE "RiskEvidence" ADD CONSTRAINT "RiskEvidence_pkey" PRIMARY KEY ("riskId", "evidenceId", "role");

CREATE TABLE "ProviderEvidenceType" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "stableKey" TEXT NOT NULL,
  "familyKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "currentnessMode" "EvidenceCurrentnessMode" NOT NULL,
  "applicableModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "applicableRiskCategoryKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "ProviderEvidenceTypeStatus" NOT NULL DEFAULT 'ACTIVE',
  "ownerId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "retiredById" UUID,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderEvidenceType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderControl" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "stableKey" TEXT NOT NULL,
  "currentVersionId" UUID,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderControl_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderControlVersion" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "controlId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "ProviderControlVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "family" "ProviderControlFamily" NOT NULL,
  "applicableRiskCategoryKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "scopeType" "ProviderControlScopeType" NOT NULL DEFAULT 'ORGANISATION',
  "accountableOwnerId" UUID,
  "expectedEvidenceFamilyKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "expectedEvidenceTypeKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "expectedEffectivenessMethod" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "reviewDueAt" TIMESTAMP(3),
  "changeRationale" TEXT NOT NULL,
  "createdById" UUID NOT NULL,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderControlVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderControlVersionLocation" (
  "controlVersionId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  CONSTRAINT "ProviderControlVersionLocation_pkey" PRIMARY KEY ("controlVersionId", "locationId")
);

CREATE TABLE "RiskControlApplication" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "riskId" UUID NOT NULL,
  "controlVersionId" UUID NOT NULL,
  "status" "RiskControlApplicationStatus" NOT NULL DEFAULT 'APPLIED',
  "controlKeySnapshot" TEXT NOT NULL,
  "versionNumberSnapshot" INTEGER NOT NULL,
  "titleSnapshot" TEXT NOT NULL,
  "descriptionSnapshot" TEXT NOT NULL,
  "familySnapshot" "ProviderControlFamily" NOT NULL,
  "expectedEvidenceSnapshot" JSONB,
  "effectivenessMethodSnapshot" TEXT,
  "appliedById" UUID NOT NULL,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewRequiredAt" TIMESTAMP(3),
  "reviewReason" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskControlApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskControlEvidence" (
  "applicationId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  "role" "EvidenceRole" NOT NULL,
  "linkedById" UUID NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskControlEvidence_pkey" PRIMARY KEY ("applicationId", "evidenceId", "role")
);

CREATE TABLE "RiskControlEffectivenessReview" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "outcome" "EffectivenessOutcome" NOT NULL,
  "method" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "reviewDate" TIMESTAMP(3) NOT NULL,
  "nextReviewDate" TIMESTAMP(3),
  "reviewerId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskControlEffectivenessReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderEvidenceType_organisationId_stableKey_key" ON "ProviderEvidenceType"("organisationId", "stableKey");
CREATE INDEX "ProviderEvidenceType_organisationId_familyKey_status_idx" ON "ProviderEvidenceType"("organisationId", "familyKey", "status");
CREATE UNIQUE INDEX "ProviderControl_organisationId_stableKey_key" ON "ProviderControl"("organisationId", "stableKey");
CREATE UNIQUE INDEX "ProviderControl_currentVersionId_key" ON "ProviderControl"("currentVersionId");
CREATE INDEX "ProviderControl_organisationId_createdAt_idx" ON "ProviderControl"("organisationId", "createdAt");
CREATE UNIQUE INDEX "ProviderControlVersion_controlId_versionNumber_key" ON "ProviderControlVersion"("controlId", "versionNumber");
CREATE INDEX "ProviderControlVersion_organisationId_status_family_idx" ON "ProviderControlVersion"("organisationId", "status", "family");
CREATE INDEX "ProviderControlVersion_applicableRiskCategoryKeys_idx" ON "ProviderControlVersion" USING GIN ("applicableRiskCategoryKeys");
CREATE INDEX "ProviderControlVersion_reviewDueAt_idx" ON "ProviderControlVersion"("reviewDueAt");
CREATE INDEX "ProviderControlVersionLocation_locationId_idx" ON "ProviderControlVersionLocation"("locationId");
CREATE UNIQUE INDEX "RiskControlApplication_riskId_controlVersionId_key" ON "RiskControlApplication"("riskId", "controlVersionId");
CREATE INDEX "RiskControlApplication_organisationId_status_appliedAt_idx" ON "RiskControlApplication"("organisationId", "status", "appliedAt");
CREATE INDEX "RiskControlApplication_controlVersionId_status_idx" ON "RiskControlApplication"("controlVersionId", "status");
CREATE INDEX "RiskControlEvidence_evidenceId_role_idx" ON "RiskControlEvidence"("evidenceId", "role");
CREATE INDEX "RiskControlEffectivenessReview_organisationId_outcome_reviewDate_idx" ON "RiskControlEffectivenessReview"("organisationId", "outcome", "reviewDate");
CREATE INDEX "RiskControlEffectivenessReview_applicationId_reviewDate_idx" ON "RiskControlEffectivenessReview"("applicationId", "reviewDate");
CREATE INDEX "Evidence_organisationId_taxonomyFamilyKey_taxonomyTypeKey_idx" ON "Evidence"("organisationId", "taxonomyFamilyKey", "taxonomyTypeKey");
CREATE INDEX "Evidence_providerEvidenceTypeId_idx" ON "Evidence"("providerEvidenceTypeId");

ALTER TABLE "ProviderEvidenceType" ADD CONSTRAINT "ProviderEvidenceType_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderEvidenceType" ADD CONSTRAINT "ProviderEvidenceType_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderEvidenceType" ADD CONSTRAINT "ProviderEvidenceType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderEvidenceType" ADD CONSTRAINT "ProviderEvidenceType_retiredById_fkey" FOREIGN KEY ("retiredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_providerEvidenceTypeId_fkey" FOREIGN KEY ("providerEvidenceTypeId") REFERENCES "ProviderEvidenceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderControl" ADD CONSTRAINT "ProviderControl_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderControl" ADD CONSTRAINT "ProviderControl_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderControlVersion" ADD CONSTRAINT "ProviderControlVersion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderControlVersion" ADD CONSTRAINT "ProviderControlVersion_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "ProviderControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderControlVersion" ADD CONSTRAINT "ProviderControlVersion_accountableOwnerId_fkey" FOREIGN KEY ("accountableOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderControlVersion" ADD CONSTRAINT "ProviderControlVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderControlVersion" ADD CONSTRAINT "ProviderControlVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderControl" ADD CONSTRAINT "ProviderControl_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ProviderControlVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderControlVersionLocation" ADD CONSTRAINT "ProviderControlVersionLocation_controlVersionId_fkey" FOREIGN KEY ("controlVersionId") REFERENCES "ProviderControlVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderControlVersionLocation" ADD CONSTRAINT "ProviderControlVersionLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskControlApplication" ADD CONSTRAINT "RiskControlApplication_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskControlApplication" ADD CONSTRAINT "RiskControlApplication_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskControlApplication" ADD CONSTRAINT "RiskControlApplication_controlVersionId_fkey" FOREIGN KEY ("controlVersionId") REFERENCES "ProviderControlVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskControlApplication" ADD CONSTRAINT "RiskControlApplication_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskControlEvidence" ADD CONSTRAINT "RiskControlEvidence_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RiskControlApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskControlEvidence" ADD CONSTRAINT "RiskControlEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskControlEvidence" ADD CONSTRAINT "RiskControlEvidence_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskControlEffectivenessReview" ADD CONSTRAINT "RiskControlEffectivenessReview_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskControlEffectivenessReview" ADD CONSTRAINT "RiskControlEffectivenessReview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RiskControlApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskControlEffectivenessReview" ADD CONSTRAINT "RiskControlEffectivenessReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Provider-wide control definition is restricted to trusted management roles.
INSERT INTO "Permission" ("id", "key", "description")
SELECT gen_random_uuid(), 'controls:manage', 'Manage provider-confirmed controls and their governed versions.'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "key" = 'controls:manage');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r CROSS JOIN "Permission" p
WHERE r."key" IN ('organisation-owner', 'registered-manager', 'quality-compliance-manager')
  AND p."key" = 'controls:manage'
ON CONFLICT DO NOTHING;
