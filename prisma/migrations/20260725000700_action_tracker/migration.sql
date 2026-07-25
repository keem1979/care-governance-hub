CREATE TYPE "ActionStatus" AS ENUM ('OPEN','IN_PROGRESS','AWAITING_EVIDENCE','AWAITING_VERIFICATION','COMPLETED','OVERDUE','CANCELLED','ARCHIVED');
CREATE TYPE "ActionPriority" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "ActionSourceType" AS ENUM ('AUDIT','COMPLAINT','INCIDENT','SAFEGUARDING','RISK','GOVERNANCE_MEETING','POLICY_REVIEW','MANUAL');
CREATE TABLE "Action" (
  "id" UUID NOT NULL,"organisationId" UUID NOT NULL,"locationId" UUID,"reference" TEXT NOT NULL,"title" TEXT NOT NULL,
  "description" TEXT NOT NULL,"sourceType" "ActionSourceType" NOT NULL,"sourceRecordId" UUID,"sourceReference" TEXT,
  "ownerId" UUID NOT NULL,"priority" "ActionPriority" NOT NULL DEFAULT 'MEDIUM',"dueDate" TIMESTAMP(3) NOT NULL,
  "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',"progressNote" TEXT,"evidenceRequired" BOOLEAN NOT NULL DEFAULT true,
  "evidenceWaiverExplanation" TEXT,"completionDate" TIMESTAMP(3),"verifiedById" UUID,"verificationDate" TIMESTAMP(3),
  "closureNote" TEXT,"archivedAt" TIMESTAMP(3),"createdById" UUID NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ActionUpdate" (
  "id" UUID NOT NULL,"actionId" UUID NOT NULL,"userId" UUID NOT NULL,"note" TEXT NOT NULL,"status" "ActionStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ActionUpdate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ActionEvidence" ("actionId" UUID NOT NULL,"evidenceId" UUID NOT NULL,CONSTRAINT "ActionEvidence_pkey" PRIMARY KEY ("actionId","evidenceId"));
CREATE UNIQUE INDEX "Action_organisationId_reference_key" ON "Action"("organisationId","reference");
CREATE INDEX "Action_organisationId_status_priority_idx" ON "Action"("organisationId","status","priority");
CREATE INDEX "Action_organisationId_dueDate_idx" ON "Action"("organisationId","dueDate");
CREATE INDEX "Action_ownerId_status_idx" ON "Action"("ownerId","status");
CREATE INDEX "Action_locationId_idx" ON "Action"("locationId");
CREATE INDEX "Action_sourceType_sourceRecordId_idx" ON "Action"("sourceType","sourceRecordId");
CREATE INDEX "ActionUpdate_actionId_createdAt_idx" ON "ActionUpdate"("actionId","createdAt");
CREATE INDEX "ActionEvidence_evidenceId_idx" ON "ActionEvidence"("evidenceId");
ALTER TABLE "Action" ADD CONSTRAINT "Action_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Action" ADD CONSTRAINT "Action_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Action" ADD CONSTRAINT "Action_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Action" ADD CONSTRAINT "Action_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Action" ADD CONSTRAINT "Action_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionUpdate" ADD CONSTRAINT "ActionUpdate_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionUpdate" ADD CONSTRAINT "ActionUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionEvidence" ADD CONSTRAINT "ActionEvidence_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionEvidence" ADD CONSTRAINT "ActionEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
