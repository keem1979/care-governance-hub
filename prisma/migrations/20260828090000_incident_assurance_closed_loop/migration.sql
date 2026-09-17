CREATE TYPE "IncidentInvestigationStatus" AS ENUM ('DRAFT', 'COMPLETED');
CREATE TYPE "IncidentAssuranceDecision" AS ENUM ('NOT_ASSURED', 'ASSURED_CLOSED', 'REOPENED');

CREATE TABLE "IncidentInvestigation" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "incidentId" UUID NOT NULL,
  "status" "IncidentInvestigationStatus" NOT NULL DEFAULT 'DRAFT',
  "factualChronology" TEXT,
  "informationSources" TEXT,
  "personRepresentativeInvolvement" TEXT,
  "immediateCauses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "contributingFactors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "systemCauses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rootCause" TEXT,
  "notificationDecisionSummary" TEXT,
  "learning" TEXT,
  "learningSharedWith" TEXT,
  "affectedRecordsReviewed" TEXT,
  "outcome" TEXT,
  "noFurtherActionRationale" TEXT,
  "investigatorId" UUID NOT NULL,
  "completedById" UUID,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncidentInvestigation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentAssuranceReview" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "incidentId" UUID NOT NULL,
  "reviewerId" UUID NOT NULL,
  "reviewerRoleKeySnapshot" TEXT NOT NULL,
  "riskLevelSnapshot" "RegisterRiskLevel" NOT NULL,
  "decision" "IncidentAssuranceDecision" NOT NULL,
  "rationale" TEXT NOT NULL,
  "checksSnapshot" JSONB NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentAssuranceReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentAssuranceReviewEvidence" (
  "reviewId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  CONSTRAINT "IncidentAssuranceReviewEvidence_pkey" PRIMARY KEY ("reviewId", "evidenceId")
);

CREATE UNIQUE INDEX "IncidentInvestigation_incidentId_key" ON "IncidentInvestigation"("incidentId");
CREATE INDEX "IncidentInvestigation_organisationId_status_updatedAt_idx" ON "IncidentInvestigation"("organisationId", "status", "updatedAt");
CREATE INDEX "IncidentInvestigation_locationId_status_idx" ON "IncidentInvestigation"("locationId", "status");
CREATE INDEX "IncidentAssuranceReview_organisationId_incidentId_reviewed_idx" ON "IncidentAssuranceReview"("organisationId", "incidentId", "reviewedAt");
CREATE INDEX "IncidentAssuranceReview_locationId_decision_reviewedAt_idx" ON "IncidentAssuranceReview"("locationId", "decision", "reviewedAt");
CREATE INDEX "IncidentAssuranceReviewEvidence_evidenceId_idx" ON "IncidentAssuranceReviewEvidence"("evidenceId");

ALTER TABLE "IncidentInvestigation" ADD CONSTRAINT "IncidentInvestigation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentInvestigation" ADD CONSTRAINT "IncidentInvestigation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentInvestigation" ADD CONSTRAINT "IncidentInvestigation_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "RegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentInvestigation" ADD CONSTRAINT "IncidentInvestigation_investigatorId_fkey" FOREIGN KEY ("investigatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentInvestigation" ADD CONSTRAINT "IncidentInvestigation_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IncidentAssuranceReview" ADD CONSTRAINT "IncidentAssuranceReview_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentAssuranceReview" ADD CONSTRAINT "IncidentAssuranceReview_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentAssuranceReview" ADD CONSTRAINT "IncidentAssuranceReview_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "RegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentAssuranceReview" ADD CONSTRAINT "IncidentAssuranceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IncidentAssuranceReviewEvidence" ADD CONSTRAINT "IncidentAssuranceReviewEvidence_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "IncidentAssuranceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentAssuranceReviewEvidence" ADD CONSTRAINT "IncidentAssuranceReviewEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep initial Incident capture quick and factual. Investigation, learning and
-- assurance now live in the governed follow-up workflow rather than the first form.
UPDATE "RegisterDefinition"
SET "fieldSchema" = '[
  {"key":"incidentType","label":"Incident type","type":"select","required":true,"options":["Care delivery","Fall or injury","Medicines","Behaviour or distress","Equipment or environment","Infection","Information governance","Staff safety","Other"]},
  {"key":"immediateResponse","label":"Immediate care, containment and escalation","type":"textarea","required":true},
  {"key":"harmLevel","label":"Verified harm position","type":"select","required":true,"options":["No harm","Low harm","Moderate harm","Severe harm","Death","Unknown / evidence required"]},
  {"key":"emergencyServices","label":"Emergency services involvement","type":"select","required":true,"options":["Involved","Not required","Awaiting confirmation"]},
  {"key":"safeguardingReferral","label":"Safeguarding referral decision","type":"select","required":true,"options":["Required / completed","Not required — rationale in investigation","Awaiting decision / evidence"]},
  {"key":"cqcNotification","label":"CQC notification decision","type":"select","required":true,"options":["Required / completed","Not required — rationale in investigation","Awaiting decision / evidence"]},
  {"key":"dutyOfCandour","label":"Duty of Candour decision","type":"select","required":true,"options":["Required / completed","Not required — rationale in investigation","Awaiting decision / evidence"]}
]'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'incidents' AND "organisationId" IS NULL;
