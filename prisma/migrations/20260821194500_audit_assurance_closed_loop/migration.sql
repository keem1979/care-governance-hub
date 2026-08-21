-- Audit fieldwork and governance assurance are separate decisions.
ALTER TABLE "Audit"
  ADD COLUMN "fieldworkCompletedById" UUID,
  ADD COLUMN "fieldworkCompletedAt" TIMESTAMP(3),
  ADD COLUMN "governanceAssuredById" UUID,
  ADD COLUMN "governanceAssuredAt" TIMESTAMP(3),
  ADD COLUMN "governanceAssuranceRationale" TEXT;

UPDATE "Audit"
SET "fieldworkCompletedById" = "signedOffById",
    "fieldworkCompletedAt" = "signedOffAt"
WHERE "status" IN ('COMPLETED', 'CLOSED', 'ARCHIVED')
  AND "signedOffAt" IS NOT NULL;

-- Stable criterion identity supports deterministic recurrence across template versions.
ALTER TABLE "AuditFinding"
  ADD COLUMN "criterionKeySnapshot" TEXT,
  ADD COLUMN "immediateControl" TEXT,
  ADD COLUMN "escalationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "escalationRationale" TEXT,
  ADD COLUMN "actionId" UUID,
  ADD COLUMN "resolvedById" UUID,
  ADD COLUMN "resolutionRationale" TEXT;

UPDATE "AuditFinding" finding
SET "criterionKeySnapshot" = template."key" || ':S' || section."sortOrder"::text || ':Q' || question."sortOrder"::text
FROM "AuditResponse" response
JOIN "AuditQuestion" question ON question."id" = response."questionId"
JOIN "AuditSection" section ON section."id" = question."sectionId"
JOIN "AuditTemplate" template ON template."id" = section."templateId"
WHERE finding."responseId" = response."id";

ALTER TABLE "AuditFinding" ALTER COLUMN "criterionKeySnapshot" SET NOT NULL;

CREATE TYPE "AuditEvidenceRole" AS ENUM ('SAMPLE', 'RESPONSE', 'FINDING', 'SUPPORTING', 'EFFECTIVENESS');
CREATE TYPE "AuditReauditOutcome" AS ENUM ('RESOLVED', 'IMPROVED_NOT_RESOLVED', 'UNCHANGED', 'DETERIORATED', 'INSUFFICIENT_EVIDENCE');

CREATE TABLE "AuditFindingEvidence" (
  "id" UUID NOT NULL,
  "auditFindingId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  "role" "AuditEvidenceRole" NOT NULL,
  "linkedById" UUID NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredById" UUID,
  "retiredAt" TIMESTAMP(3),
  "retirementReason" TEXT,
  "evidenceSnapshot" JSONB,
  CONSTRAINT "AuditFindingEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditReaudit" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "findingId" UUID NOT NULL,
  "criterionKeySnapshot" TEXT NOT NULL,
  "reviewDate" TIMESTAMP(3) NOT NULL,
  "outcome" "AuditReauditOutcome" NOT NULL,
  "sampleSize" INTEGER,
  "sampleDetails" TEXT,
  "result" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reviewerId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditReaudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditReauditEvidence" (
  "id" UUID NOT NULL,
  "reauditId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  "linkedById" UUID NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditReauditEvidence_pkey" PRIMARY KEY ("id")
);

-- Provider-configurable assurance for non-Risk Actions. Existing Actions retain safe QCGMS defaults until an effective policy exists.
CREATE TABLE "ActionAssurancePolicyVersion" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "RiskFrameworkStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "changeRationale" TEXT NOT NULL,
  "createdById" UUID NOT NULL,
  "submittedById" UUID,
  "approvedById" UUID,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActionAssurancePolicyVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActionAssuranceRule" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "policyVersionId" UUID NOT NULL,
  "sourceType" "ActionSourceType" NOT NULL,
  "priority" "ActionPriority" NOT NULL,
  "verificationRequired" BOOLEAN NOT NULL,
  "effectivenessRequired" BOOLEAN NOT NULL,
  "separateVerifierRequired" BOOLEAN NOT NULL,
  "separateCloserRequired" BOOLEAN NOT NULL,
  "rootCauseRequired" BOOLEAN NOT NULL,
  "closureRoleKeys" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionAssuranceRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditFinding_actionId_key" ON "AuditFinding"("actionId");
CREATE INDEX "AuditFinding_criterionKeySnapshot_resolvedAt_idx" ON "AuditFinding"("criterionKeySnapshot", "resolvedAt");
CREATE UNIQUE INDEX "AuditFindingEvidence_auditFindingId_evidenceId_role_retiredAt_key" ON "AuditFindingEvidence"("auditFindingId", "evidenceId", "role", "retiredAt");
-- PostgreSQL treats NULL values as distinct in a regular unique index. Enforce
-- one active role link while still allowing an immutable retire/re-link history.
CREATE UNIQUE INDEX "AuditFindingEvidence_active_role_key" ON "AuditFindingEvidence"("auditFindingId", "evidenceId", "role") WHERE "retiredAt" IS NULL;
CREATE INDEX "AuditFindingEvidence_auditFindingId_role_retiredAt_idx" ON "AuditFindingEvidence"("auditFindingId", "role", "retiredAt");
CREATE INDEX "AuditFindingEvidence_evidenceId_role_retiredAt_idx" ON "AuditFindingEvidence"("evidenceId", "role", "retiredAt");
CREATE INDEX "AuditReaudit_organisationId_locationId_criterionKeySnapshot_reviewDate_idx" ON "AuditReaudit"("organisationId", "locationId", "criterionKeySnapshot", "reviewDate");
CREATE INDEX "AuditReaudit_findingId_reviewDate_idx" ON "AuditReaudit"("findingId", "reviewDate");
CREATE UNIQUE INDEX "AuditReauditEvidence_reauditId_evidenceId_key" ON "AuditReauditEvidence"("reauditId", "evidenceId");
CREATE INDEX "AuditReauditEvidence_evidenceId_idx" ON "AuditReauditEvidence"("evidenceId");
CREATE UNIQUE INDEX "ActionAssurancePolicyVersion_organisationId_versionNumber_key" ON "ActionAssurancePolicyVersion"("organisationId", "versionNumber");
CREATE INDEX "ActionAssurancePolicyVersion_organisationId_status_effectiveFrom_idx" ON "ActionAssurancePolicyVersion"("organisationId", "status", "effectiveFrom");
CREATE UNIQUE INDEX "ActionAssuranceRule_policyVersionId_sourceType_priority_key" ON "ActionAssuranceRule"("policyVersionId", "sourceType", "priority");
CREATE INDEX "ActionAssuranceRule_organisationId_sourceType_priority_idx" ON "ActionAssuranceRule"("organisationId", "sourceType", "priority");

ALTER TABLE "Audit" ADD CONSTRAINT "Audit_fieldworkCompletedById_fkey" FOREIGN KEY ("fieldworkCompletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_governanceAssuredById_fkey" FOREIGN KEY ("governanceAssuredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditFindingEvidence" ADD CONSTRAINT "AuditFindingEvidence_auditFindingId_fkey" FOREIGN KEY ("auditFindingId") REFERENCES "AuditFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditFindingEvidence" ADD CONSTRAINT "AuditFindingEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditFindingEvidence" ADD CONSTRAINT "AuditFindingEvidence_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditFindingEvidence" ADD CONSTRAINT "AuditFindingEvidence_retiredById_fkey" FOREIGN KEY ("retiredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditReaudit" ADD CONSTRAINT "AuditReaudit_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditReaudit" ADD CONSTRAINT "AuditReaudit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditReaudit" ADD CONSTRAINT "AuditReaudit_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "AuditFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditReaudit" ADD CONSTRAINT "AuditReaudit_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditReauditEvidence" ADD CONSTRAINT "AuditReauditEvidence_reauditId_fkey" FOREIGN KEY ("reauditId") REFERENCES "AuditReaudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditReauditEvidence" ADD CONSTRAINT "AuditReauditEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditReauditEvidence" ADD CONSTRAINT "AuditReauditEvidence_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionAssurancePolicyVersion" ADD CONSTRAINT "ActionAssurancePolicyVersion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionAssurancePolicyVersion" ADD CONSTRAINT "ActionAssurancePolicyVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionAssurancePolicyVersion" ADD CONSTRAINT "ActionAssurancePolicyVersion_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionAssurancePolicyVersion" ADD CONSTRAINT "ActionAssurancePolicyVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionAssuranceRule" ADD CONSTRAINT "ActionAssuranceRule_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionAssuranceRule" ADD CONSTRAINT "ActionAssuranceRule_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "ActionAssurancePolicyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
