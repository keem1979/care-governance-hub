CREATE TYPE "AssuranceLifecycleStatus" AS ENUM ('NEW_FINDING','UNDER_REVIEW','DUPLICATE_CANDIDATE','LINKED_TO_EXISTING_ACTION','ACTION_REQUIRED','ACTION_IN_PROGRESS','AWAITING_EVIDENCE','MANAGEMENT_RESPONSE_RECORDED','AWAITING_VERIFICATION','CLOSED_VERIFIED','MONITORING_RECURRENCE','REOPENED_REPEAT_FINDING','NO_ACTION_REQUIRED');
CREATE TYPE "MedicationIssueType" AS ENUM ('OUT_OF_STOCK','DISCONTINUED_BY_PRESCRIBER','NOT_DUE','PRN_NOT_REQUIRED','SERVICE_USER_REFUSAL','OMITTED_DOSE','RECORDING_ERROR','MAR_ENTRY_UNAVAILABLE','SUPPLY_REQUEST_SUBMITTED','SUPPLY_RECEIVED','CLARIFICATION_PENDING','RESOLVED_VERIFIED');
CREATE TYPE "OccurrenceDecision" AS ENUM ('ORIGINAL','SUGGESTED','LINK_CONFIRMED','MATCH_REJECTED','RECURRENCE_CONFIRMED');

ALTER TABLE "Action"
  ADD COLUMN "clientId" UUID,
  ADD COLUMN "staffMemberId" UUID,
  ADD COLUMN "lifecycleStatus" "AssuranceLifecycleStatus" NOT NULL DEFAULT 'ACTION_REQUIRED',
  ADD COLUMN "issueKey" TEXT,
  ADD COLUMN "medicationIssueType" "MedicationIssueType",
  ADD COLUMN "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "recurrenceCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "monitoringUntil" TIMESTAMP(3),
  ADD COLUMN "managementResponse" TEXT,
  ADD COLUMN "managementResponseById" UUID,
  ADD COLUMN "managementResponseAt" TIMESTAMP(3),
  ADD COLUMN "completedActionSummary" TEXT,
  ADD COLUMN "evidenceReviewedSummary" TEXT,
  ADD COLUMN "immediateRiskControlled" BOOLEAN,
  ADD COLUMN "underlyingRecordCorrected" BOOLEAN,
  ADD COLUMN "staffSupportCompleted" BOOLEAN,
  ADD COLUMN "widerRecordsChecked" BOOLEAN,
  ADD COLUMN "recurrenceChecked" BOOLEAN,
  ADD COLUMN "verificationRationale" TEXT,
  ADD COLUMN "nextRecurrenceReviewDate" TIMESTAMP(3),
  ADD COLUMN "sustainedImprovementAt" TIMESTAMP(3);

CREATE TABLE "ActionOccurrence" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "actionId" UUID NOT NULL,
  "locationId" UUID,
  "clientId" UUID,
  "staffMemberId" UUID,
  "sourceType" "ActionSourceType" NOT NULL,
  "sourceRecordId" UUID,
  "sourceReference" TEXT,
  "sourceUrl" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "category" TEXT NOT NULL,
  "issueKey" TEXT,
  "medicationIssueType" "MedicationIssueType",
  "narrative" TEXT NOT NULL,
  "evidenceId" UUID,
  "decision" "OccurrenceDecision" NOT NULL DEFAULT 'ORIGINAL',
  "matchScore" INTEGER,
  "matchRationale" TEXT,
  "decidedById" UUID,
  "decidedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionOccurrence_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Action" ADD CONSTRAINT "Action_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Action" ADD CONSTRAINT "Action_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Action" ADD CONSTRAINT "Action_managementResponseById_fkey" FOREIGN KEY ("managementResponseById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionOccurrence" ADD CONSTRAINT "ActionOccurrence_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionOccurrence" ADD CONSTRAINT "ActionOccurrence_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionOccurrence" ADD CONSTRAINT "ActionOccurrence_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionOccurrence" ADD CONSTRAINT "ActionOccurrence_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionOccurrence" ADD CONSTRAINT "ActionOccurrence_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionOccurrence" ADD CONSTRAINT "ActionOccurrence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionOccurrence" ADD CONSTRAINT "ActionOccurrence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionOccurrence" ADD CONSTRAINT "ActionOccurrence_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ActionOccurrence_actionId_sourceType_sourceRecordId_key" ON "ActionOccurrence"("actionId","sourceType","sourceRecordId");
CREATE INDEX "Action_organisationId_lifecycleStatus_lastSeenAt_idx" ON "Action"("organisationId","lifecycleStatus","lastSeenAt");
CREATE INDEX "Action_clientId_category_lifecycleStatus_idx" ON "Action"("clientId","category","lifecycleStatus");
CREATE INDEX "Action_staffMemberId_category_lifecycleStatus_idx" ON "Action"("staffMemberId","category","lifecycleStatus");
CREATE INDEX "ActionOccurrence_organisationId_occurredAt_idx" ON "ActionOccurrence"("organisationId","occurredAt");
CREATE INDEX "ActionOccurrence_clientId_category_occurredAt_idx" ON "ActionOccurrence"("clientId","category","occurredAt");
CREATE INDEX "ActionOccurrence_staffMemberId_category_occurredAt_idx" ON "ActionOccurrence"("staffMemberId","category","occurredAt");
CREATE INDEX "ActionOccurrence_actionId_decision_occurredAt_idx" ON "ActionOccurrence"("actionId","decision","occurredAt");
