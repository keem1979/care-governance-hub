CREATE TYPE "AcknowledgementRequirementStatus" AS ENUM ('REQUIRED', 'ACKNOWLEDGED', 'UNDERSTANDING_SUBMITTED', 'COMPLETE', 'SUPPORT_REQUIRED', 'EXEMPT');
CREATE TYPE "UnderstandingCheckMethod" AS ENUM ('KNOWLEDGE_QUESTION', 'MANAGER_OBSERVATION', 'DISCUSSION');
CREATE TYPE "UnderstandingCheckOutcome" AS ENUM ('PENDING', 'AWAITING_REVIEW', 'SATISFACTORY', 'SUPPORT_REQUIRED', 'OBSERVATION_REQUIRED');

ALTER TABLE "StaffMember" ADD COLUMN "userId" UUID;
ALTER TABLE "CarePlanStaffAssignment" ADD COLUMN "versionId" UUID;
ALTER TABLE "CarePlanAcknowledgement" ADD COLUMN "requirementId" UUID;

UPDATE "CarePlanStaffAssignment" assignment
SET "versionId" = plan."currentVersionId"
FROM "CarePlan" plan
WHERE assignment."carePlanId" = plan."id" AND assignment."versionId" IS NULL;

UPDATE "CarePlan" plan
SET "currentVersionId" = NULL, "currentVersionNumber" = 0
WHERE plan."currentVersionId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "CarePlanVersion" version
    WHERE version."id" = plan."currentVersionId" AND version."status" = 'PUBLISHED'
  );

UPDATE "CarePlanStaffAssignment" assignment
SET "versionId" = NULL
WHERE assignment."versionId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "CarePlanVersion" version WHERE version."id" = assignment."versionId");

DROP INDEX IF EXISTS "CarePlanStaffAssignment_carePlanId_staffMemberId_key";
CREATE UNIQUE INDEX "StaffMember_userId_key" ON "StaffMember"("userId");
CREATE UNIQUE INDEX "CarePlanStaffAssignment_versionId_staffMemberId_key" ON "CarePlanStaffAssignment"("versionId", "staffMemberId");
CREATE INDEX "CarePlanStaffAssignment_carePlanId_staffMemberId_idx" ON "CarePlanStaffAssignment"("carePlanId", "staffMemberId");
CREATE UNIQUE INDEX "CarePlanAcknowledgement_requirementId_key" ON "CarePlanAcknowledgement"("requirementId");

CREATE TABLE "AcknowledgementRequirement" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "locationId" UUID,
    "carePlanId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "staffMemberId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "materialSections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "criticalChange" BOOLEAN NOT NULL DEFAULT false,
    "requiresUnderstandingCheck" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "AcknowledgementRequirementStatus" NOT NULL DEFAULT 'REQUIRED',
    "completedAt" TIMESTAMP(3),
    "exemptedAt" TIMESTAMP(3),
    "exemptionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcknowledgementRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnderstandingCheck" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "locationId" UUID,
    "requirementId" UUID NOT NULL,
    "method" "UnderstandingCheckMethod" NOT NULL DEFAULT 'KNOWLEDGE_QUESTION',
    "prompt" TEXT NOT NULL,
    "staffResponse" TEXT,
    "submittedAt" TIMESTAMP(3),
    "outcome" "UnderstandingCheckOutcome" NOT NULL DEFAULT 'PENDING',
    "assessorNotes" TEXT,
    "completedById" UUID,
    "assessedById" UUID,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UnderstandingCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareCompetencyRequirement" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "locationId" UUID,
    "carePlanId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "trainingCourseId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CareCompetencyRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcknowledgementRequirement_versionId_staffMemberId_key" ON "AcknowledgementRequirement"("versionId", "staffMemberId");
CREATE INDEX "AcknowledgementRequirement_organisationId_status_dueAt_idx" ON "AcknowledgementRequirement"("organisationId", "status", "dueAt");
CREATE INDEX "AcknowledgementRequirement_staffMemberId_status_idx" ON "AcknowledgementRequirement"("staffMemberId", "status");
CREATE INDEX "AcknowledgementRequirement_locationId_status_idx" ON "AcknowledgementRequirement"("locationId", "status");
CREATE UNIQUE INDEX "UnderstandingCheck_requirementId_key" ON "UnderstandingCheck"("requirementId");
CREATE INDEX "UnderstandingCheck_organisationId_outcome_submittedAt_idx" ON "UnderstandingCheck"("organisationId", "outcome", "submittedAt");
CREATE INDEX "UnderstandingCheck_locationId_outcome_idx" ON "UnderstandingCheck"("locationId", "outcome");
CREATE UNIQUE INDEX "CareCompetencyRequirement_versionId_trainingCourseId_key" ON "CareCompetencyRequirement"("versionId", "trainingCourseId");
CREATE INDEX "CareCompetencyRequirement_organisationId_critical_idx" ON "CareCompetencyRequirement"("organisationId", "critical");
CREATE INDEX "CareCompetencyRequirement_carePlanId_versionId_idx" ON "CareCompetencyRequirement"("carePlanId", "versionId");
CREATE INDEX "CareCompetencyRequirement_locationId_idx" ON "CareCompetencyRequirement"("locationId");

ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CarePlanStaffAssignment" ADD CONSTRAINT "CarePlanStaffAssignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CarePlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "CarePlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CarePlanStaffAssignment" ADD CONSTRAINT "CarePlanStaffAssignment_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarePlanAcknowledgement" ADD CONSTRAINT "CarePlanAcknowledgement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "AcknowledgementRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcknowledgementRequirement" ADD CONSTRAINT "AcknowledgementRequirement_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcknowledgementRequirement" ADD CONSTRAINT "AcknowledgementRequirement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcknowledgementRequirement" ADD CONSTRAINT "AcknowledgementRequirement_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcknowledgementRequirement" ADD CONSTRAINT "AcknowledgementRequirement_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CarePlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcknowledgementRequirement" ADD CONSTRAINT "AcknowledgementRequirement_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UnderstandingCheck" ADD CONSTRAINT "UnderstandingCheck_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnderstandingCheck" ADD CONSTRAINT "UnderstandingCheck_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnderstandingCheck" ADD CONSTRAINT "UnderstandingCheck_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "AcknowledgementRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UnderstandingCheck" ADD CONSTRAINT "UnderstandingCheck_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UnderstandingCheck" ADD CONSTRAINT "UnderstandingCheck_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareCompetencyRequirement" ADD CONSTRAINT "CareCompetencyRequirement_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareCompetencyRequirement" ADD CONSTRAINT "CareCompetencyRequirement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareCompetencyRequirement" ADD CONSTRAINT "CareCompetencyRequirement_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareCompetencyRequirement" ADD CONSTRAINT "CareCompetencyRequirement_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CarePlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareCompetencyRequirement" ADD CONSTRAINT "CareCompetencyRequirement_trainingCourseId_fkey" FOREIGN KEY ("trainingCourseId") REFERENCES "TrainingCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareCompetencyRequirement" ADD CONSTRAINT "CareCompetencyRequirement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve assurance continuity for care-plan versions published before Phase 5.
INSERT INTO "AcknowledgementRequirement" (
  "id", "organisationId", "locationId", "carePlanId", "versionId", "staffMemberId",
  "reason", "materialSections", "criticalChange", "requiresUnderstandingCheck", "dueAt",
  "status", "completedAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), plan."organisationId", plan."locationId", plan."id", version."id", assignment."staffMemberId",
  CASE WHEN critical."value" THEN 'Critical or safety-related care instructions require confirmation.' ELSE 'The published version requires staff acknowledgement.' END,
  version."materialSections", critical."value", critical."value",
  COALESCE(version."publishedAt", version."approvedAt", version."updatedAt") + CASE WHEN critical."value" THEN INTERVAL '2 days' ELSE INTERVAL '7 days' END,
  CASE WHEN acknowledgement."id" IS NOT NULL AND critical."value" THEN 'ACKNOWLEDGED'::"AcknowledgementRequirementStatus"
       WHEN acknowledgement."id" IS NOT NULL THEN 'COMPLETE'::"AcknowledgementRequirementStatus"
       ELSE 'REQUIRED'::"AcknowledgementRequirementStatus" END,
  CASE WHEN acknowledgement."id" IS NOT NULL AND NOT critical."value" THEN acknowledgement."acknowledgedAt" ELSE NULL END,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CarePlan" plan
JOIN "CarePlanVersion" version ON version."id" = plan."currentVersionId" AND version."status" = 'PUBLISHED'
JOIN "CarePlanStaffAssignment" assignment ON assignment."carePlanId" = plan."id" AND assignment."isActive" = true AND (assignment."versionId" = version."id" OR assignment."versionId" IS NULL)
CROSS JOIN LATERAL (
  SELECT plan."overallRisk" = 'CRITICAL' OR array_to_string(version."materialSections", ' ') ~* '(medication|deterioration|risk|safeguarding|capacity|moving|feeding|insulin)' AS "value"
) critical
LEFT JOIN "CarePlanAcknowledgement" acknowledgement ON acknowledgement."versionId" = version."id" AND acknowledgement."staffMemberId" = assignment."staffMemberId"
WHERE plan."staffAcknowledgementRequired" = true OR version."acknowledgementRequired" = true OR critical."value"
ON CONFLICT ("versionId", "staffMemberId") DO NOTHING;

UPDATE "CarePlanAcknowledgement" acknowledgement
SET "requirementId" = requirement."id"
FROM "AcknowledgementRequirement" requirement
WHERE acknowledgement."versionId" = requirement."versionId"
  AND acknowledgement."staffMemberId" = requirement."staffMemberId"
  AND acknowledgement."requirementId" IS NULL
  AND acknowledgement."id" = (
    SELECT selected."id" FROM "CarePlanAcknowledgement" selected
    WHERE selected."versionId" = acknowledgement."versionId"
      AND selected."staffMemberId" = acknowledgement."staffMemberId"
    ORDER BY selected."acknowledgedAt" DESC, selected."id"
    LIMIT 1
  );

INSERT INTO "UnderstandingCheck" (
  "id", "organisationId", "locationId", "requirementId", "prompt", "outcome", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), requirement."organisationId", requirement."locationId", requirement."id",
  'Explain the approved care instruction, what must not be done, and when to escalate or seek help for ' || plan."reference" || ' version ' || version."versionNumber" || '.',
  'PENDING'::"UnderstandingCheckOutcome", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "AcknowledgementRequirement" requirement
JOIN "CarePlan" plan ON plan."id" = requirement."carePlanId"
JOIN "CarePlanVersion" version ON version."id" = requirement."versionId"
WHERE requirement."requiresUnderstandingCheck" = true
ON CONFLICT ("requirementId") DO NOTHING;

UPDATE "CarePlan" plan
SET "staffAcknowledgementRequired" = true
WHERE EXISTS (
  SELECT 1 FROM "AcknowledgementRequirement" requirement
  WHERE requirement."carePlanId" = plan."id" AND requirement."versionId" = plan."currentVersionId"
);
