CREATE TYPE "PolicyWorkflowStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ARCHIVED');
CREATE TYPE "PolicyApprovalStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Policy" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "ownerId" UUID NOT NULL,
  "currentVersionId" UUID,
  "effectiveDate" TIMESTAMP(3),
  "lastReviewDate" TIMESTAMP(3),
  "nextReviewDate" TIMESTAMP(3),
  "approvalStatus" "PolicyApprovalStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "complianceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "status" "PolicyWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
  "archivedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PolicyVersion" (
  "id" UUID NOT NULL,
  "policyId" UUID NOT NULL,
  "versionNumber" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "changeNotes" TEXT,
  "uploadedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Policy_currentVersionId_key" ON "Policy"("currentVersionId");
CREATE INDEX "Policy_organisationId_status_idx" ON "Policy"("organisationId", "status");
CREATE INDEX "Policy_organisationId_nextReviewDate_idx" ON "Policy"("organisationId", "nextReviewDate");
CREATE INDEX "Policy_organisationId_category_idx" ON "Policy"("organisationId", "category");
CREATE UNIQUE INDEX "PolicyVersion_storageKey_key" ON "PolicyVersion"("storageKey");
CREATE UNIQUE INDEX "PolicyVersion_policyId_versionNumber_key" ON "PolicyVersion"("policyId", "versionNumber");
CREATE INDEX "PolicyVersion_policyId_createdAt_idx" ON "PolicyVersion"("policyId", "createdAt");

ALTER TABLE "Policy" ADD CONSTRAINT "Policy_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "PolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
