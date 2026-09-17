CREATE TYPE "SafeguardingCaseStatus" AS ENUM ('DRAFT','TRIAGED','REFERRED','ENQUIRY_IN_PROGRESS','AWAITING_EXTERNAL_RESPONSE','READY_FOR_ASSURANCE');
CREATE TYPE "SafeguardingSafetyPosition" AS ENUM ('SAFE_NOW','CONTROLLED_IMMEDIATE_RISK','UNRESOLVED_IMMEDIATE_RISK','UNKNOWN_EVIDENCE_REQUIRED');
CREATE TYPE "SafeguardingReferralDecision" AS ENUM ('AWAITING_DECISION','REQUIRED','MADE','NOT_REQUIRED');
CREATE TYPE "SafeguardingEventType" AS ENUM ('CONCERN_RAISED','IMMEDIATE_CONTROL','REFERRAL','COMMUNICATION','EXTERNAL_RESPONSE','ENQUIRY_UPDATE','EVIDENCE_ADDED','ACTION_CREATED','PROGRESS_UPDATE','OUTCOME','ASSURANCE','CLOSURE','REOPENING','OTHER');
CREATE TYPE "SafeguardingAssuranceDecision" AS ENUM ('NOT_ASSURED','ASSURED_CLOSED','REOPENED');

CREATE TABLE "SafeguardingCase" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "safeguardingId" UUID NOT NULL,
  "status" "SafeguardingCaseStatus" NOT NULL DEFAULT 'DRAFT',
  "safetyPosition" "SafeguardingSafetyPosition" NOT NULL DEFAULT 'UNKNOWN_EVIDENCE_REQUIRED',
  "immediateControl" TEXT,
  "concernCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "triageRationale" TEXT,
  "referralDecision" "SafeguardingReferralDecision" NOT NULL DEFAULT 'AWAITING_DECISION',
  "referredTo" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "referralDate" TIMESTAMP(3),
  "externalReference" TEXT,
  "externalResponseDueAt" TIMESTAMP(3),
  "externalResponseStatus" TEXT,
  "investigationQuestion" TEXT,
  "investigationSummary" TEXT,
  "peopleConsulted" TEXT,
  "findings" TEXT,
  "outcome" TEXT,
  "externalDependencies" TEXT,
  "learning" TEXT,
  "affectedRecordsReviewed" TEXT,
  "recurrenceReview" TEXT,
  "noFurtherActionRationale" TEXT,
  "originatingIncidentId" UUID,
  "originatingComplaintId" UUID,
  "investigatorId" UUID NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafeguardingCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafeguardingEvent" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "safeguardingId" UUID NOT NULL,
  "type" "SafeguardingEventType" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "summary" TEXT NOT NULL,
  "participants" TEXT,
  "authorId" UUID NOT NULL,
  "evidenceId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafeguardingEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafeguardingAssuranceReview" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "safeguardingId" UUID NOT NULL,
  "reviewerId" UUID NOT NULL,
  "reviewerRoleKeySnapshot" TEXT NOT NULL,
  "riskLevelSnapshot" "RegisterRiskLevel" NOT NULL,
  "decision" "SafeguardingAssuranceDecision" NOT NULL,
  "rationale" TEXT NOT NULL,
  "newInformation" TEXT,
  "checksSnapshot" JSONB NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafeguardingAssuranceReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafeguardingAssuranceReviewEvidence" (
  "reviewId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  CONSTRAINT "SafeguardingAssuranceReviewEvidence_pkey" PRIMARY KEY ("reviewId","evidenceId")
);

CREATE UNIQUE INDEX "SafeguardingCase_safeguardingId_key" ON "SafeguardingCase"("safeguardingId");
CREATE INDEX "SafeguardingCase_organisationId_status_externalResponseDueAt_idx" ON "SafeguardingCase"("organisationId","status","externalResponseDueAt");
CREATE INDEX "SafeguardingCase_locationId_status_idx" ON "SafeguardingCase"("locationId","status");
CREATE INDEX "SafeguardingCase_investigatorId_status_idx" ON "SafeguardingCase"("investigatorId","status");
CREATE INDEX "SafeguardingCase_originatingIncidentId_idx" ON "SafeguardingCase"("originatingIncidentId");
CREATE INDEX "SafeguardingCase_originatingComplaintId_idx" ON "SafeguardingCase"("originatingComplaintId");
CREATE INDEX "SafeguardingEvent_organisationId_safeguardingId_occurredAt_idx" ON "SafeguardingEvent"("organisationId","safeguardingId","occurredAt");
CREATE INDEX "SafeguardingEvent_locationId_occurredAt_idx" ON "SafeguardingEvent"("locationId","occurredAt");
CREATE INDEX "SafeguardingEvent_organisationId_type_occurredAt_idx" ON "SafeguardingEvent"("organisationId","type","occurredAt");
CREATE INDEX "SafeguardingAssuranceReview_organisationId_safeguardingId_reviewedAt_idx" ON "SafeguardingAssuranceReview"("organisationId","safeguardingId","reviewedAt");
CREATE INDEX "SafeguardingAssuranceReview_locationId_decision_reviewedAt_idx" ON "SafeguardingAssuranceReview"("locationId","decision","reviewedAt");
CREATE INDEX "SafeguardingAssuranceReviewEvidence_evidenceId_idx" ON "SafeguardingAssuranceReviewEvidence"("evidenceId");

ALTER TABLE "SafeguardingCase" ADD CONSTRAINT "SafeguardingCase_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingCase" ADD CONSTRAINT "SafeguardingCase_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingCase" ADD CONSTRAINT "SafeguardingCase_safeguardingId_fkey" FOREIGN KEY ("safeguardingId") REFERENCES "RegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingCase" ADD CONSTRAINT "SafeguardingCase_originatingIncidentId_fkey" FOREIGN KEY ("originatingIncidentId") REFERENCES "RegisterEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SafeguardingCase" ADD CONSTRAINT "SafeguardingCase_originatingComplaintId_fkey" FOREIGN KEY ("originatingComplaintId") REFERENCES "RegisterEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SafeguardingCase" ADD CONSTRAINT "SafeguardingCase_investigatorId_fkey" FOREIGN KEY ("investigatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingEvent" ADD CONSTRAINT "SafeguardingEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingEvent" ADD CONSTRAINT "SafeguardingEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingEvent" ADD CONSTRAINT "SafeguardingEvent_safeguardingId_fkey" FOREIGN KEY ("safeguardingId") REFERENCES "RegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingEvent" ADD CONSTRAINT "SafeguardingEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingEvent" ADD CONSTRAINT "SafeguardingEvent_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SafeguardingAssuranceReview" ADD CONSTRAINT "SafeguardingAssuranceReview_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingAssuranceReview" ADD CONSTRAINT "SafeguardingAssuranceReview_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingAssuranceReview" ADD CONSTRAINT "SafeguardingAssuranceReview_safeguardingId_fkey" FOREIGN KEY ("safeguardingId") REFERENCES "RegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingAssuranceReview" ADD CONSTRAINT "SafeguardingAssuranceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafeguardingAssuranceReviewEvidence" ADD CONSTRAINT "SafeguardingAssuranceReviewEvidence_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "SafeguardingAssuranceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafeguardingAssuranceReviewEvidence" ADD CONSTRAINT "SafeguardingAssuranceReviewEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "SafeguardingCase" (
  "id","organisationId","locationId","safeguardingId","status","safetyPosition","immediateControl","concernCategories","triageRationale","referralDecision","referralDate","externalReference","investigatorId","completedAt","updatedAt"
)
SELECT gen_random_uuid(), e."organisationId", e."locationId", e."id",
  CASE WHEN e."status" = 'CLOSED' THEN 'READY_FOR_ASSURANCE'::"SafeguardingCaseStatus" ELSE 'DRAFT'::"SafeguardingCaseStatus" END,
  CASE WHEN NULLIF(BTRIM(e."data"->>'immediateResponse'),'') IS NOT NULL THEN 'CONTROLLED_IMMEDIATE_RISK'::"SafeguardingSafetyPosition" ELSE 'UNKNOWN_EVIDENCE_REQUIRED'::"SafeguardingSafetyPosition" END,
  NULLIF(BTRIM(e."data"->>'immediateResponse'),''),
  CASE WHEN NULLIF(BTRIM(e."data"->>'category'),'') IS NULL THEN ARRAY[]::TEXT[] ELSE ARRAY[e."data"->>'category'] END,
  'Migrated from the legacy safeguarding register. Review and confirm the structured safeguarding position at the next material update.',
  CASE WHEN NULLIF(BTRIM(e."data"->>'localAuthorityReferralDate'),'') IS NOT NULL THEN 'MADE'::"SafeguardingReferralDecision" ELSE 'AWAITING_DECISION'::"SafeguardingReferralDecision" END,
  CASE WHEN (e."data"->>'localAuthorityReferralDate') ~ '^\d{4}-\d{2}-\d{2}$' THEN (e."data"->>'localAuthorityReferralDate')::timestamp ELSE NULL END,
  NULL,
  COALESCE(e."ownerId",e."createdById"),
  CASE WHEN e."status"='CLOSED' THEN e."closureDate" ELSE NULL END,
  CURRENT_TIMESTAMP
FROM "RegisterEntry" e
JOIN "RegisterDefinition" d ON d."id"=e."definitionId"
WHERE d."key"='safeguarding'
ON CONFLICT ("safeguardingId") DO NOTHING;

UPDATE "RegisterDefinition"
SET "fieldSchema"='[{"key":"safetyPosition","label":"Is the person safe now?","type":"select","required":true,"options":["Safe now","Immediate risk controlled","Immediate risk unresolved","Unknown / evidence required"]},{"key":"immediateResponse","label":"Immediate action already taken","type":"textarea"},{"key":"raisedBy","label":"Who raised the concern?","type":"text"}]'::jsonb,
    "description"='Fast safeguarding concern capture with progressive triage, referral, enquiry, central Actions, Evidence and management assurance.',
    "updatedAt"=CURRENT_TIMESTAMP
WHERE "key"='safeguarding';
