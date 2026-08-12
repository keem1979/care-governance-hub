ALTER TABLE "ComplianceRequirement" DROP CONSTRAINT IF EXISTS "ComplianceRequirement_signedOffById_fkey";
ALTER TABLE "ComplianceRequirement" DROP CONSTRAINT IF EXISTS "ComplianceRequirement_reviewedById_fkey";
DROP INDEX IF EXISTS "ComplianceRequirement_signedOffById_idx";
DROP INDEX IF EXISTS "ComplianceRequirement_reviewedById_idx";
DROP INDEX IF EXISTS "ComplianceRequirement_organisationId_catalogueKey_key";
ALTER TABLE "ComplianceRequirement" DROP COLUMN "signedOffAt", DROP COLUMN "signedOffById", DROP COLUMN "reviewedAt", DROP COLUMN "reviewedById", DROP COLUMN "managementDecision", DROP COLUMN "impactOnPeople", DROP COLUMN "areasForImprovement", DROP COLUMN "strengths", DROP COLUMN "serviceSpecific", DROP COLUMN "coveredEvidenceCategories", DROP COLUMN "expectedEvidenceCategories", DROP COLUMN "regulations", DROP COLUMN "reviewFrequency", DROP COLUMN "frameworkSourceUrl", DROP COLUMN "frameworkVersion", DROP COLUMN "catalogueKey";
DROP TYPE IF EXISTS "InspectionManagementDecision";
