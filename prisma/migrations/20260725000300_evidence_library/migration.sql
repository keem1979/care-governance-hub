CREATE TYPE "EvidenceConfidentiality" AS ENUM ('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');
CREATE TYPE "EvidenceWorkflowStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "Evidence" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "locationId" UUID,
  "title" TEXT NOT NULL, "description" TEXT, "category" TEXT NOT NULL,
  "evidenceType" TEXT NOT NULL, "ownerId" UUID NOT NULL, "currentVersionId" UUID,
  "evidenceDate" TIMESTAMP(3), "reviewExpiryDate" TIMESTAMP(3), "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "relatedModule" TEXT, "relatedRecordId" TEXT, "confidentiality" "EvidenceConfidentiality" NOT NULL DEFAULT 'INTERNAL',
  "status" "EvidenceWorkflowStatus" NOT NULL DEFAULT 'ACTIVE', "notes" TEXT, "archivedAt" TIMESTAMP(3),
  "uploadedById" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceVersion" (
  "id" UUID NOT NULL, "evidenceId" UUID NOT NULL, "versionNumber" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL, "fileName" TEXT NOT NULL, "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL, "checksum" TEXT NOT NULL, "changeNotes" TEXT,
  "uploadedById" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Evidence_currentVersionId_key" ON "Evidence"("currentVersionId");
CREATE INDEX "Evidence_organisationId_status_idx" ON "Evidence"("organisationId", "status");
CREATE INDEX "Evidence_organisationId_category_idx" ON "Evidence"("organisationId", "category");
CREATE INDEX "Evidence_organisationId_reviewExpiryDate_idx" ON "Evidence"("organisationId", "reviewExpiryDate");
CREATE INDEX "Evidence_locationId_idx" ON "Evidence"("locationId");
CREATE UNIQUE INDEX "EvidenceVersion_storageKey_key" ON "EvidenceVersion"("storageKey");
CREATE UNIQUE INDEX "EvidenceVersion_evidenceId_versionNumber_key" ON "EvidenceVersion"("evidenceId", "versionNumber");
CREATE INDEX "EvidenceVersion_evidenceId_createdAt_idx" ON "EvidenceVersion"("evidenceId", "createdAt");

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvidenceVersion" ADD CONSTRAINT "EvidenceVersion_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceVersion" ADD CONSTRAINT "EvidenceVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "EvidenceVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
