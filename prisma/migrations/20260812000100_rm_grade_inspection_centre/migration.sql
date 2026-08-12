CREATE TYPE "InspectionManagementDecision" AS ENUM ('NOT_REVIEWED','ASSURED','PARTIALLY_ASSURED','NOT_ASSURED','NOT_APPLICABLE');

ALTER TABLE "ComplianceRequirement"
  ADD COLUMN "catalogueKey" TEXT,
  ADD COLUMN "frameworkVersion" TEXT NOT NULL DEFAULT 'CQC provider framework transition 2026',
  ADD COLUMN "frameworkSourceUrl" TEXT,
  ADD COLUMN "reviewFrequency" TEXT,
  ADD COLUMN "regulations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "expectedEvidenceCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "coveredEvidenceCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "serviceSpecific" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "strengths" TEXT,
  ADD COLUMN "areasForImprovement" TEXT,
  ADD COLUMN "impactOnPeople" TEXT,
  ADD COLUMN "managementDecision" "InspectionManagementDecision" NOT NULL DEFAULT 'NOT_REVIEWED',
  ADD COLUMN "reviewedById" UUID,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "signedOffById" UUID,
  ADD COLUMN "signedOffAt" TIMESTAMP(3);

UPDATE "ComplianceRequirement" SET "catalogueKey" = CASE "title"
  WHEN 'Learning from incidents' THEN 'safe-incidents'
  WHEN 'Safeguarding people from abuse' THEN 'safe-safeguarding-log'
  WHEN 'Safe staffing and recruitment' THEN 'safe-recruitment-files'
  WHEN 'Assessment and care planning' THEN 'effective-assessments'
  WHEN 'Policy and practice alignment' THEN 'well-policy-control'
  WHEN 'Training, supervision and appraisal' THEN 'effective-training-matrix'
  WHEN 'Respectful care' THEN 'caring-dignity'
  WHEN 'Person-centred involvement' THEN 'caring-involvement'
  WHEN 'Responsive day-to-day support' THEN 'responsive-call-log'
  WHEN 'Care adapted to changing needs' THEN 'responsive-preferences'
  WHEN 'Complaints and feedback' THEN 'responsive-complaints'
  WHEN 'Continuity and coordination' THEN 'effective-transitions'
  WHEN 'Effective governance' THEN 'well-governance-minutes'
  WHEN 'Open and transparent culture' THEN 'well-staff-feedback'
  WHEN 'Partnership working' THEN 'well-partner-feedback'
  ELSE NULL END;

CREATE UNIQUE INDEX "ComplianceRequirement_organisationId_catalogueKey_key" ON "ComplianceRequirement"("organisationId", "catalogueKey");
CREATE INDEX "ComplianceRequirement_reviewedById_idx" ON "ComplianceRequirement"("reviewedById");
CREATE INDEX "ComplianceRequirement_signedOffById_idx" ON "ComplianceRequirement"("signedOffById");
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_signedOffById_fkey" FOREIGN KEY ("signedOffById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
