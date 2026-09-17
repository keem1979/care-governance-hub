CREATE TYPE "ComplaintInvestigationStatus" AS ENUM ('DRAFT', 'COMPLETED');
CREATE TYPE "ComplaintIssueFinding" AS ENUM ('UPHELD', 'PARTLY_UPHELD', 'NOT_UPHELD', 'INCONCLUSIVE', 'WITHDRAWN');
CREATE TYPE "ComplaintCommunicationType" AS ENUM ('ACKNOWLEDGEMENT', 'PROGRESS_UPDATE', 'INFORMATION_REQUEST', 'EXTENSION', 'TELEPHONE_DISCUSSION', 'MEETING', 'CORRESPONDENCE_SENT', 'FINAL_RESPONSE', 'POST_RESPONSE', 'OTHER');
CREATE TYPE "ComplaintCommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'MUTUAL', 'INTERNAL');
CREATE TYPE "ComplaintAssuranceDecision" AS ENUM ('NOT_ASSURED', 'ASSURED_CLOSED', 'REOPENED');

CREATE TABLE "ComplaintInvestigation" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "complaintId" UUID NOT NULL,
  "status" "ComplaintInvestigationStatus" NOT NULL DEFAULT 'DRAFT',
  "complainantName" TEXT,
  "complainantRelationship" TEXT,
  "representationAuthority" TEXT,
  "contactPreference" TEXT,
  "accessibilityNeeds" TEXT,
  "category" TEXT,
  "immediateSafetyConcern" TEXT,
  "immediateSafetyResponse" TEXT,
  "safeguardingDecision" TEXT,
  "incidentDecision" TEXT,
  "triageSummary" TEXT,
  "acknowledgementDueAt" TIMESTAMP(3),
  "responseDueAt" TIMESTAMP(3),
  "extensionDueAt" TIMESTAMP(3),
  "extensionReason" TEXT,
  "investigationApproach" TEXT,
  "evidenceSources" TEXT,
  "complainantInvolvement" TEXT,
  "investigationOutcome" TEXT,
  "remedy" TEXT,
  "learning" TEXT,
  "learningScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "affectedRecordsReviewed" TEXT,
  "recurrenceReview" TEXT,
  "noFurtherActionRationale" TEXT,
  "responsePreparedAt" TIMESTAMP(3),
  "responseSummary" TEXT,
  "responseApprovedById" UUID,
  "responseApprovedAt" TIMESTAMP(3),
  "findingsCommunicated" BOOLEAN,
  "remedyCommunicated" BOOLEAN,
  "learningCommunicated" BOOLEAN,
  "escalationRightsConfirmed" BOOLEAN,
  "complainantSatisfaction" TEXT,
  "satisfactionComment" TEXT,
  "legacyInvestigator" TEXT,
  "investigatorId" UUID NOT NULL,
  "completedById" UUID,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintInvestigation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplaintIssue" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "complaintId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "concern" TEXT NOT NULL,
  "finding" "ComplaintIssueFinding",
  "reasoning" TEXT,
  "outcomeSummary" TEXT,
  "actionRequired" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplaintIssueEvidence" (
  "issueId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  CONSTRAINT "ComplaintIssueEvidence_pkey" PRIMARY KEY ("issueId", "evidenceId")
);

CREATE TABLE "ComplaintCommunication" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "complaintId" UUID NOT NULL,
  "type" "ComplaintCommunicationType" NOT NULL,
  "direction" "ComplaintCommunicationDirection" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "participants" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "authorId" UUID NOT NULL,
  "evidenceId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintCommunication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplaintAssuranceReview" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "complaintId" UUID NOT NULL,
  "reviewerId" UUID NOT NULL,
  "reviewerRoleKeySnapshot" TEXT NOT NULL,
  "riskLevelSnapshot" "RegisterRiskLevel" NOT NULL,
  "decision" "ComplaintAssuranceDecision" NOT NULL,
  "rationale" TEXT NOT NULL,
  "newInformation" TEXT,
  "checksSnapshot" JSONB NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintAssuranceReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplaintAssuranceReviewEvidence" (
  "reviewId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  CONSTRAINT "ComplaintAssuranceReviewEvidence_pkey" PRIMARY KEY ("reviewId", "evidenceId")
);

CREATE UNIQUE INDEX "ComplaintInvestigation_complaintId_key" ON "ComplaintInvestigation"("complaintId");
CREATE INDEX "ComplaintInvestigation_organisationId_status_responseDueAt_idx" ON "ComplaintInvestigation"("organisationId", "status", "responseDueAt");
CREATE INDEX "ComplaintInvestigation_locationId_status_idx" ON "ComplaintInvestigation"("locationId", "status");
CREATE INDEX "ComplaintInvestigation_investigatorId_status_idx" ON "ComplaintInvestigation"("investigatorId", "status");
CREATE INDEX "ComplaintInvestigation_organisationId_acknowledgementDueAt_idx" ON "ComplaintInvestigation"("organisationId", "acknowledgementDueAt");
CREATE UNIQUE INDEX "ComplaintIssue_complaintId_sequence_key" ON "ComplaintIssue"("complaintId", "sequence");
CREATE INDEX "ComplaintIssue_organisationId_category_finding_idx" ON "ComplaintIssue"("organisationId", "category", "finding");
CREATE INDEX "ComplaintIssue_locationId_category_idx" ON "ComplaintIssue"("locationId", "category");
CREATE INDEX "ComplaintIssueEvidence_evidenceId_idx" ON "ComplaintIssueEvidence"("evidenceId");
CREATE INDEX "ComplaintCommunication_organisationId_complaintId_occurredAt_idx" ON "ComplaintCommunication"("organisationId", "complaintId", "occurredAt");
CREATE INDEX "ComplaintCommunication_locationId_occurredAt_idx" ON "ComplaintCommunication"("locationId", "occurredAt");
CREATE INDEX "ComplaintCommunication_organisationId_type_occurredAt_idx" ON "ComplaintCommunication"("organisationId", "type", "occurredAt");
CREATE INDEX "ComplaintAssuranceReview_organisationId_complaintId_reviewedAt_idx" ON "ComplaintAssuranceReview"("organisationId", "complaintId", "reviewedAt");
CREATE INDEX "ComplaintAssuranceReview_locationId_decision_reviewedAt_idx" ON "ComplaintAssuranceReview"("locationId", "decision", "reviewedAt");
CREATE INDEX "ComplaintAssuranceReviewEvidence_evidenceId_idx" ON "ComplaintAssuranceReviewEvidence"("evidenceId");

ALTER TABLE "ComplaintInvestigation" ADD CONSTRAINT "ComplaintInvestigation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintInvestigation" ADD CONSTRAINT "ComplaintInvestigation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintInvestigation" ADD CONSTRAINT "ComplaintInvestigation_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "RegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintInvestigation" ADD CONSTRAINT "ComplaintInvestigation_investigatorId_fkey" FOREIGN KEY ("investigatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintInvestigation" ADD CONSTRAINT "ComplaintInvestigation_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplaintInvestigation" ADD CONSTRAINT "ComplaintInvestigation_responseApprovedById_fkey" FOREIGN KEY ("responseApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplaintIssue" ADD CONSTRAINT "ComplaintIssue_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintIssue" ADD CONSTRAINT "ComplaintIssue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintIssue" ADD CONSTRAINT "ComplaintIssue_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "RegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintIssueEvidence" ADD CONSTRAINT "ComplaintIssueEvidence_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ComplaintIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintIssueEvidence" ADD CONSTRAINT "ComplaintIssueEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintCommunication" ADD CONSTRAINT "ComplaintCommunication_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintCommunication" ADD CONSTRAINT "ComplaintCommunication_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintCommunication" ADD CONSTRAINT "ComplaintCommunication_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "RegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintCommunication" ADD CONSTRAINT "ComplaintCommunication_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintCommunication" ADD CONSTRAINT "ComplaintCommunication_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplaintAssuranceReview" ADD CONSTRAINT "ComplaintAssuranceReview_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintAssuranceReview" ADD CONSTRAINT "ComplaintAssuranceReview_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintAssuranceReview" ADD CONSTRAINT "ComplaintAssuranceReview_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "RegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintAssuranceReview" ADD CONSTRAINT "ComplaintAssuranceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintAssuranceReviewEvidence" ADD CONSTRAINT "ComplaintAssuranceReviewEvidence_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ComplaintAssuranceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintAssuranceReviewEvidence" ADD CONSTRAINT "ComplaintAssuranceReviewEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ComplaintInvestigation" (
  "id", "organisationId", "locationId", "complaintId", "complainantName", "category",
  "responseDueAt", "investigationOutcome", "learning", "legacyInvestigator", "investigatorId", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), entry."organisationId", entry."locationId", entry."id",
  NULLIF(entry."data"->>'complainantFirstName', ''), NULLIF(entry."data"->>'category', ''),
  CASE WHEN COALESCE(entry."data"->>'targetResponseDate', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN (entry."data"->>'targetResponseDate')::date ELSE NULL END,
  NULLIF(entry."data"->>'outcome', ''), NULLIF(entry."data"->>'learning', ''), NULLIF(entry."data"->>'investigator', ''),
  COALESCE(entry."ownerId", entry."createdById"), entry."createdAt", CURRENT_TIMESTAMP
FROM "RegisterEntry" entry
JOIN "RegisterDefinition" definition ON definition."id" = entry."definitionId"
WHERE definition."key" = 'complaints'
ON CONFLICT ("complaintId") DO NOTHING;

INSERT INTO "ComplaintCommunication" (
  "id", "organisationId", "locationId", "complaintId", "type", "direction", "occurredAt", "participants", "summary", "authorId", "createdAt"
)
SELECT
  gen_random_uuid(), entry."organisationId", entry."locationId", entry."id", 'ACKNOWLEDGEMENT', 'OUTBOUND',
  (entry."data"->>'acknowledgementDate')::date,
  COALESCE(NULLIF(entry."data"->>'complainantFirstName', ''), 'Complainant'),
  'Legacy acknowledgement date preserved during the Complaints Assurance upgrade.', entry."createdById", CURRENT_TIMESTAMP
FROM "RegisterEntry" entry
JOIN "RegisterDefinition" definition ON definition."id" = entry."definitionId"
WHERE definition."key" = 'complaints'
  AND COALESCE(entry."data"->>'acknowledgementDate', '') ~ '^\d{4}-\d{2}-\d{2}$';

UPDATE "RegisterDefinition"
SET "fieldSchema" = '[
  {"key":"complainantName","label":"Complainant name or safe reference","type":"text"},
  {"key":"complainantRelationship","label":"Relationship to the person receiving care","type":"text"},
  {"key":"contactPreference","label":"Preferred contact method","type":"select","options":["Phone","Email","Letter","Meeting","Representative","Other"]},
  {"key":"accessibilityNeeds","label":"Communication or accessibility requirement","type":"textarea"},
  {"key":"category","label":"Initial complaint category","type":"select","required":true,"options":["Care quality","Communication","Staff conduct","Medicines","Missed or late care","Dignity and respect","Safeguarding concern","Fees or administration","Other"]},
  {"key":"immediateSafetyConcern","label":"Immediate safety position","type":"select","required":true,"options":["No immediate safety concern identified","Immediate safety concern controlled","Immediate safety concern requiring action","Unknown / evidence required"]},
  {"key":"immediateSafetyResponse","label":"Immediate response or interim control","type":"textarea"}
]'::jsonb,
"updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'complaints' AND "organisationId" IS NULL;
