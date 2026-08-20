CREATE TYPE "EvidenceSourceType" AS ENUM ('INTERNAL_RECORD', 'UPLOADED_DOCUMENT', 'EXTERNAL_DOCUMENT', 'SYSTEM_GENERATED', 'OBSERVATION', 'FEEDBACK', 'DATASET', 'OTHER');
CREATE TYPE "EvidenceVerificationOutcome" AS ENUM ('VERIFIED', 'VERIFIED_WITH_LIMITATIONS', 'REJECTED');
CREATE TYPE "EvidenceMappingDecision" AS ENUM ('PENDING', 'SUITABLE', 'PARTIALLY_SUITABLE', 'NOT_SUITABLE');
CREATE TYPE "RegulatoryFrameworkStatus" AS ENUM ('DRAFT', 'CURRENT', 'SUPERSEDED', 'WITHDRAWN');
CREATE TYPE "FrameworkChangeReviewStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'ACTIONS_REQUIRED', 'IMPLEMENTED', 'NO_ACTION_REQUIRED');
CREATE TYPE "MockInspectionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'AWAITING_REVIEW', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MockInspectionOutcome" AS ENUM ('NOT_TESTED', 'ASSURED', 'PARTIALLY_ASSURED', 'GAP', 'NOT_APPLICABLE');

ALTER TABLE "Evidence"
  ADD COLUMN "sourceType" "EvidenceSourceType" NOT NULL DEFAULT 'UPLOADED_DOCUMENT',
  ADD COLUMN "sourceName" TEXT,
  ADD COLUMN "sourceReference" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "originalAuthor" TEXT,
  ADD COLUMN "capturedAt" TIMESTAMP(3),
  ADD COLUMN "provenanceNote" TEXT;

-- Existing evidence receives provenance labels, but no record is automatically verified.
UPDATE "Evidence"
SET
  "sourceType" = CASE
    WHEN "relatedModule" IN ('Template', 'WorkforceTrainingMatrix') THEN 'SYSTEM_GENERATED'::"EvidenceSourceType"
    WHEN "generatedPolicyId" IS NOT NULL OR 'system-generated' = ANY("tags") THEN 'INTERNAL_RECORD'::"EvidenceSourceType"
    ELSE 'UPLOADED_DOCUMENT'::"EvidenceSourceType"
  END,
  "sourceName" = CASE "relatedModule"
    WHEN 'Action' THEN 'Action Tracker'
    WHEN 'Audit' THEN 'Audit Centre'
    WHEN 'GovernanceMeeting' THEN 'Governance Meetings'
    WHEN 'Policy' THEN 'Policy Studio'
    WHEN 'RegisterEntry' THEN 'Controlled Register'
    WHEN 'Risk' THEN 'Risk Register'
    WHEN 'Template' THEN 'Template Library'
    WHEN 'WorkforceTrainingMatrix' THEN 'Workforce training matrix'
    WHEN 'StaffMember' THEN 'Workforce staff profile'
    ELSE 'Legacy evidence upload'
  END,
  "sourceReference" = COALESCE("relatedRecordId", "generatedPolicyTemplateKey"),
  "capturedAt" = COALESCE("evidenceDate", "createdAt")
WHERE "sourceName" IS NULL;

ALTER TABLE "ComplianceRequirementEvidence"
  ADD COLUMN "decision" "EvidenceMappingDecision" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rationale" TEXT,
  ADD COLUMN "evidenceCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "mappedById" UUID,
  ADD COLUMN "mappedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE TABLE "EvidenceVerification" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "evidenceId" UUID NOT NULL,
  "evidenceVersionId" UUID,
  "outcome" "EvidenceVerificationOutcome" NOT NULL,
  "relevance" TEXT NOT NULL,
  "currencyAssessment" TEXT NOT NULL,
  "authenticityCheck" TEXT NOT NULL,
  "limitations" TEXT,
  "reviewDueAt" TIMESTAMP(3),
  "verifiedById" UUID NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PolicyRequirementMapping" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "policyId" UUID NOT NULL,
  "requirementId" UUID NOT NULL,
  "decision" "EvidenceMappingDecision" NOT NULL DEFAULT 'PENDING',
  "rationale" TEXT NOT NULL,
  "mappedById" UUID NOT NULL,
  "mappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "PolicyRequirementMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TemplateRequirementMapping" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "requirementId" UUID NOT NULL,
  "decision" "EvidenceMappingDecision" NOT NULL DEFAULT 'PENDING',
  "rationale" TEXT NOT NULL,
  "mappedById" UUID NOT NULL,
  "mappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "TemplateRequirementMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegulatoryFrameworkVersion" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "regulator" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "effectiveFrom" TIMESTAMP(3),
  "status" "RegulatoryFrameworkStatus" NOT NULL DEFAULT 'DRAFT',
  "summary" TEXT NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegulatoryFrameworkVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FrameworkChangeReview" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "frameworkVersionId" UUID NOT NULL,
  "status" "FrameworkChangeReviewStatus" NOT NULL DEFAULT 'NEW',
  "changeSummary" TEXT NOT NULL,
  "affectedRequirementIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "affectedPolicyIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "affectedTemplateIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "impactAssessment" TEXT,
  "actionSummary" TEXT,
  "ownerId" UUID NOT NULL,
  "reviewDueAt" TIMESTAMP(3) NOT NULL,
  "completedById" UUID,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FrameworkChangeReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MockInspection" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "title" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "frameworkLabel" TEXT NOT NULL,
  "status" "MockInspectionStatus" NOT NULL DEFAULT 'PLANNED',
  "plannedAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "leadId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MockInspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MockInspectionSample" (
  "id" UUID NOT NULL,
  "mockInspectionId" UUID NOT NULL,
  "complianceRequirementId" UUID NOT NULL,
  "outcome" "MockInspectionOutcome" NOT NULL DEFAULT 'NOT_TESTED',
  "sampledEvidenceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "observation" TEXT,
  "peopleExperience" TEXT,
  "staffFeedback" TEXT,
  "finding" TEXT,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MockInspectionSample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EvidenceVerification_organisationId_outcome_verifiedAt_idx" ON "EvidenceVerification"("organisationId", "outcome", "verifiedAt");
CREATE INDEX "EvidenceVerification_evidenceId_verifiedAt_idx" ON "EvidenceVerification"("evidenceId", "verifiedAt");
CREATE INDEX "EvidenceVerification_evidenceVersionId_idx" ON "EvidenceVerification"("evidenceVersionId");
CREATE INDEX "EvidenceVerification_locationId_outcome_idx" ON "EvidenceVerification"("locationId", "outcome");

CREATE UNIQUE INDEX "PolicyRequirementMapping_policyId_requirementId_key" ON "PolicyRequirementMapping"("policyId", "requirementId");
CREATE INDEX "PolicyRequirementMapping_organisationId_decision_idx" ON "PolicyRequirementMapping"("organisationId", "decision");
CREATE INDEX "PolicyRequirementMapping_requirementId_idx" ON "PolicyRequirementMapping"("requirementId");

CREATE UNIQUE INDEX "TemplateRequirementMapping_templateId_requirementId_key" ON "TemplateRequirementMapping"("templateId", "requirementId");
CREATE INDEX "TemplateRequirementMapping_organisationId_decision_idx" ON "TemplateRequirementMapping"("organisationId", "decision");
CREATE INDEX "TemplateRequirementMapping_requirementId_idx" ON "TemplateRequirementMapping"("requirementId");

CREATE UNIQUE INDEX "RegulatoryFrameworkVersion_organisationId_regulator_versionLabel_key" ON "RegulatoryFrameworkVersion"("organisationId", "regulator", "versionLabel");
CREATE INDEX "RegulatoryFrameworkVersion_organisationId_status_effectiveFrom_idx" ON "RegulatoryFrameworkVersion"("organisationId", "status", "effectiveFrom");

CREATE INDEX "FrameworkChangeReview_organisationId_status_reviewDueAt_idx" ON "FrameworkChangeReview"("organisationId", "status", "reviewDueAt");
CREATE INDEX "FrameworkChangeReview_locationId_status_idx" ON "FrameworkChangeReview"("locationId", "status");

CREATE INDEX "MockInspection_organisationId_status_plannedAt_idx" ON "MockInspection"("organisationId", "status", "plannedAt");
CREATE INDEX "MockInspection_locationId_status_idx" ON "MockInspection"("locationId", "status");

CREATE UNIQUE INDEX "MockInspectionSample_mockInspectionId_complianceRequirementId_key" ON "MockInspectionSample"("mockInspectionId", "complianceRequirementId");
CREATE INDEX "MockInspectionSample_complianceRequirementId_outcome_idx" ON "MockInspectionSample"("complianceRequirementId", "outcome");

ALTER TABLE "ComplianceRequirementEvidence" ADD CONSTRAINT "ComplianceRequirementEvidence_mappedById_fkey" FOREIGN KEY ("mappedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceVerification" ADD CONSTRAINT "EvidenceVerification_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvidenceVerification" ADD CONSTRAINT "EvidenceVerification_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvidenceVerification" ADD CONSTRAINT "EvidenceVerification_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceVerification" ADD CONSTRAINT "EvidenceVerification_evidenceVersionId_fkey" FOREIGN KEY ("evidenceVersionId") REFERENCES "EvidenceVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceVerification" ADD CONSTRAINT "EvidenceVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PolicyRequirementMapping" ADD CONSTRAINT "PolicyRequirementMapping_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PolicyRequirementMapping" ADD CONSTRAINT "PolicyRequirementMapping_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PolicyRequirementMapping" ADD CONSTRAINT "PolicyRequirementMapping_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PolicyRequirementMapping" ADD CONSTRAINT "PolicyRequirementMapping_mappedById_fkey" FOREIGN KEY ("mappedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TemplateRequirementMapping" ADD CONSTRAINT "TemplateRequirementMapping_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TemplateRequirementMapping" ADD CONSTRAINT "TemplateRequirementMapping_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateRequirementMapping" ADD CONSTRAINT "TemplateRequirementMapping_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateRequirementMapping" ADD CONSTRAINT "TemplateRequirementMapping_mappedById_fkey" FOREIGN KEY ("mappedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegulatoryFrameworkVersion" ADD CONSTRAINT "RegulatoryFrameworkVersion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegulatoryFrameworkVersion" ADD CONSTRAINT "RegulatoryFrameworkVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FrameworkChangeReview" ADD CONSTRAINT "FrameworkChangeReview_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FrameworkChangeReview" ADD CONSTRAINT "FrameworkChangeReview_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FrameworkChangeReview" ADD CONSTRAINT "FrameworkChangeReview_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "RegulatoryFrameworkVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FrameworkChangeReview" ADD CONSTRAINT "FrameworkChangeReview_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FrameworkChangeReview" ADD CONSTRAINT "FrameworkChangeReview_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MockInspection" ADD CONSTRAINT "MockInspection_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockInspection" ADD CONSTRAINT "MockInspection_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MockInspection" ADD CONSTRAINT "MockInspection_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MockInspection" ADD CONSTRAINT "MockInspection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MockInspectionSample" ADD CONSTRAINT "MockInspectionSample_mockInspectionId_fkey" FOREIGN KEY ("mockInspectionId") REFERENCES "MockInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockInspectionSample" ADD CONSTRAINT "MockInspectionSample_complianceRequirementId_fkey" FOREIGN KEY ("complianceRequirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MockInspectionSample" ADD CONSTRAINT "MockInspectionSample_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
