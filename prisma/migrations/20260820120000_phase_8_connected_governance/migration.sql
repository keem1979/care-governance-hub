CREATE TYPE "IntegrationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');
CREATE TYPE "IntegrationStatus" AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'ACTIVE', 'PAUSED', 'ERROR', 'REVOKED');
CREATE TYPE "IntegrationHealth" AS ENUM ('HEALTHY', 'DEGRADED', 'FAILED', 'NEVER_RUN');
CREATE TYPE "IntegrationAuthMode" AS ENUM ('API_TOKEN', 'MANAGED_SECRET', 'NONE');
CREATE TYPE "IntegrationEventStatus" AS ENUM ('RECEIVED', 'MATCHED', 'QUARANTINED', 'APPLIED', 'FAILED', 'ACKNOWLEDGED');
CREATE TYPE "IntegrationOperation" AS ENUM ('CREATE', 'UPDATE', 'UPSERT', 'DELETE');
CREATE TYPE "ImportTarget" AS ENUM ('CLIENT', 'STAFF_MEMBER');
CREATE TYPE "ImportBatchStatus" AS ENUM ('UPLOADED', 'ANALYSED', 'AWAITING_RECONCILIATION', 'READY_TO_APPLY', 'PARTIALLY_APPLIED', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "ImportRowStatus" AS ENUM ('READY_TO_CREATE', 'EXACT_MATCH', 'POTENTIAL_MATCH', 'INVALID', 'CREATED', 'LINKED_NO_CHANGE', 'SKIPPED');
CREATE TYPE "SourceAuthorityLevel" AS ENUM ('AUTHORITATIVE', 'CONTRIBUTING', 'REFERENCE_ONLY');
CREATE TYPE "OfflineCaptureType" AS ENUM ('OBSERVATION', 'ACTION_EVIDENCE', 'RISK_EVIDENCE', 'POLICY_EVIDENCE', 'OTHER');
CREATE TYPE "OfflineCaptureStatus" AS ENUM ('PENDING_REVIEW', 'CONFLICT', 'ACCEPTED', 'REJECTED');

CREATE TABLE "IntegrationConnection" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "vendor" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "direction" "IntegrationDirection" NOT NULL,
  "dataClassification" TEXT NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'DRAFT',
  "health" "IntegrationHealth" NOT NULL DEFAULT 'NEVER_RUN',
  "endpointUrl" TEXT,
  "authMode" "IntegrationAuthMode" NOT NULL DEFAULT 'API_TOKEN',
  "ownerId" UUID NOT NULL,
  "reviewDueAt" TIMESTAMP(3) NOT NULL,
  "gateBusinessNeed" BOOLEAN NOT NULL DEFAULT false,
  "gateDataProtection" BOOLEAN NOT NULL DEFAULT false,
  "gateSupplierAssurance" BOOLEAN NOT NULL DEFAULT false,
  "gateSecurityDesign" BOOLEAN NOT NULL DEFAULT false,
  "gateTechnicalMapping" BOOLEAN NOT NULL DEFAULT false,
  "gateSafeTesting" BOOLEAN NOT NULL DEFAULT false,
  "gateOperations" BOOLEAN NOT NULL DEFAULT false,
  "gateApproval" BOOLEAN NOT NULL DEFAULT false,
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationCredential" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "connectionId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "tokenPrefix" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "expiresAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationEvent" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "connectionId" UUID NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "entityType" "CanonicalEntityType",
  "operation" "IntegrationOperation" NOT NULL,
  "externalId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "payloadChecksum" TEXT NOT NULL,
  "status" "IntegrationEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "matchedRecordId" UUID,
  "reconciliationCaseId" UUID,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportBatch" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "connectionId" UUID,
  "reference" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "target" "ImportTarget" NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" "ImportBatchStatus" NOT NULL DEFAULT 'UPLOADED',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "readyRows" INTEGER NOT NULL DEFAULT 0,
  "matchedRows" INTEGER NOT NULL DEFAULT 0,
  "conflictRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "appliedRows" INTEGER NOT NULL DEFAULT 0,
  "failureSummary" TEXT,
  "createdById" UUID NOT NULL,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportRow" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "externalId" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "dateOfBirth" TIMESTAMP(3),
  "jobTitle" TEXT,
  "locationCode" TEXT,
  "rawPayload" JSONB NOT NULL,
  "status" "ImportRowStatus" NOT NULL,
  "validationMessages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "candidateRecordIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "candidateLabels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "canonicalRecordId" UUID,
  "reconciliationCaseId" UUID,
  "appliedById" UUID,
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceAuthority" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "entityType" "CanonicalEntityType" NOT NULL,
  "connectionId" UUID,
  "sourceSystem" TEXT NOT NULL,
  "authorityLevel" "SourceAuthorityLevel" NOT NULL,
  "governedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rationale" TEXT NOT NULL,
  "approvedById" UUID NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewDueAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourceAuthority_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfflineCapture" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "clientCaptureId" TEXT NOT NULL,
  "captureType" "OfflineCaptureType" NOT NULL,
  "title" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deviceIdHash" TEXT NOT NULL,
  "sourceRecordType" TEXT,
  "sourceRecordId" UUID,
  "baseUpdatedAt" TIMESTAMP(3),
  "status" "OfflineCaptureStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "conflictReason" TEXT,
  "evidenceId" UUID,
  "submittedById" UUID NOT NULL,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfflineCapture_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ExternalIdentifier" ADD COLUMN "connectionId" UUID;

CREATE UNIQUE INDEX "IntegrationConnection_organisationId_key_key" ON "IntegrationConnection"("organisationId", "key");
CREATE INDEX "IntegrationConnection_organisationId_status_health_idx" ON "IntegrationConnection"("organisationId", "status", "health");
CREATE INDEX "IntegrationConnection_locationId_status_idx" ON "IntegrationConnection"("locationId", "status");
CREATE INDEX "IntegrationConnection_ownerId_reviewDueAt_idx" ON "IntegrationConnection"("ownerId", "reviewDueAt");
CREATE UNIQUE INDEX "IntegrationCredential_tokenHash_key" ON "IntegrationCredential"("tokenHash");
CREATE INDEX "IntegrationCredential_organisationId_tokenPrefix_revokedAt_idx" ON "IntegrationCredential"("organisationId", "tokenPrefix", "revokedAt");
CREATE INDEX "IntegrationCredential_connectionId_revokedAt_idx" ON "IntegrationCredential"("connectionId", "revokedAt");
CREATE UNIQUE INDEX "IntegrationEvent_connectionId_externalEventId_key" ON "IntegrationEvent"("connectionId", "externalEventId");
CREATE INDEX "IntegrationEvent_organisationId_status_receivedAt_idx" ON "IntegrationEvent"("organisationId", "status", "receivedAt");
CREATE INDEX "IntegrationEvent_connectionId_status_receivedAt_idx" ON "IntegrationEvent"("connectionId", "status", "receivedAt");
CREATE INDEX "IntegrationEvent_locationId_status_idx" ON "IntegrationEvent"("locationId", "status");
CREATE INDEX "IntegrationEvent_reconciliationCaseId_idx" ON "IntegrationEvent"("reconciliationCaseId");
CREATE UNIQUE INDEX "ImportBatch_organisationId_reference_key" ON "ImportBatch"("organisationId", "reference");
CREATE UNIQUE INDEX "ImportBatch_organisationId_checksum_target_key" ON "ImportBatch"("organisationId", "checksum", "target");
CREATE INDEX "ImportBatch_organisationId_status_createdAt_idx" ON "ImportBatch"("organisationId", "status", "createdAt");
CREATE INDEX "ImportBatch_locationId_status_idx" ON "ImportBatch"("locationId", "status");
CREATE INDEX "ImportBatch_connectionId_status_idx" ON "ImportBatch"("connectionId", "status");
CREATE UNIQUE INDEX "ImportRow_batchId_rowNumber_key" ON "ImportRow"("batchId", "rowNumber");
CREATE INDEX "ImportRow_organisationId_status_createdAt_idx" ON "ImportRow"("organisationId", "status", "createdAt");
CREATE INDEX "ImportRow_batchId_status_idx" ON "ImportRow"("batchId", "status");
CREATE INDEX "ImportRow_reconciliationCaseId_idx" ON "ImportRow"("reconciliationCaseId");
CREATE UNIQUE INDEX "SourceAuthority_organisationId_entityType_key" ON "SourceAuthority"("organisationId", "entityType");
CREATE INDEX "SourceAuthority_organisationId_authorityLevel_reviewDueAt_idx" ON "SourceAuthority"("organisationId", "authorityLevel", "reviewDueAt");
CREATE INDEX "SourceAuthority_connectionId_idx" ON "SourceAuthority"("connectionId");
CREATE UNIQUE INDEX "OfflineCapture_organisationId_clientCaptureId_key" ON "OfflineCapture"("organisationId", "clientCaptureId");
CREATE INDEX "OfflineCapture_organisationId_status_receivedAt_idx" ON "OfflineCapture"("organisationId", "status", "receivedAt");
CREATE INDEX "OfflineCapture_locationId_status_idx" ON "OfflineCapture"("locationId", "status");
CREATE INDEX "OfflineCapture_submittedById_status_idx" ON "OfflineCapture"("submittedById", "status");
CREATE INDEX "ExternalIdentifier_connectionId_idx" ON "ExternalIdentifier"("connectionId");

ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationCredential" ADD CONSTRAINT "IntegrationCredential_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationCredential" ADD CONSTRAINT "IntegrationCredential_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationCredential" ADD CONSTRAINT "IntegrationCredential_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_reconciliationCaseId_fkey" FOREIGN KEY ("reconciliationCaseId") REFERENCES "ReconciliationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_reconciliationCaseId_fkey" FOREIGN KEY ("reconciliationCaseId") REFERENCES "ReconciliationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceAuthority" ADD CONSTRAINT "SourceAuthority_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SourceAuthority" ADD CONSTRAINT "SourceAuthority_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceAuthority" ADD CONSTRAINT "SourceAuthority_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfflineCapture" ADD CONSTRAINT "OfflineCapture_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfflineCapture" ADD CONSTRAINT "OfflineCapture_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfflineCapture" ADD CONSTRAINT "OfflineCapture_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfflineCapture" ADD CONSTRAINT "OfflineCapture_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfflineCapture" ADD CONSTRAINT "OfflineCapture_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalIdentifier" ADD CONSTRAINT "ExternalIdentifier_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExternalIdentifier" ADD CONSTRAINT "ExternalIdentifier_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
