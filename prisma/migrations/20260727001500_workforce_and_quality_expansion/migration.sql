CREATE TYPE "StaffEmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'LEFT');
CREATE TYPE "StaffComplianceType" AS ENUM (
  'DBS',
  'RIGHT_TO_WORK',
  'VISA',
  'PROFESSIONAL_REGISTRATION',
  'TRAINING',
  'COMPETENCY',
  'SUPERVISION',
  'APPRAISAL',
  'SPOT_CHECK',
  'INFORMATION_GOVERNANCE',
  'OTHER'
);
CREATE TYPE "StaffComplianceOutcome" AS ENUM (
  'VALID',
  'PENDING',
  'COMPETENT',
  'DEVELOPMENT_REQUIRED',
  'NOT_APPLICABLE'
);

CREATE TABLE "StaffMember" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "employeeReference" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "jobTitle" TEXT NOT NULL,
  "department" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "employmentStatus" "StaffEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "lineManager" TEXT,
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffComplianceRecord" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "staffMemberId" UUID NOT NULL,
  "type" "StaffComplianceType" NOT NULL,
  "title" TEXT NOT NULL,
  "reference" TEXT,
  "completedDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "nextDueDate" TIMESTAMP(3),
  "outcome" "StaffComplianceOutcome" NOT NULL DEFAULT 'PENDING',
  "assessor" TEXT,
  "verifiedById" UUID,
  "verifiedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffComplianceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffMember_organisationId_employeeReference_key"
ON "StaffMember"("organisationId", "employeeReference");
CREATE INDEX "StaffMember_organisationId_employmentStatus_idx"
ON "StaffMember"("organisationId", "employmentStatus");
CREATE INDEX "StaffMember_locationId_idx" ON "StaffMember"("locationId");
CREATE INDEX "StaffComplianceRecord_organisationId_type_outcome_idx"
ON "StaffComplianceRecord"("organisationId", "type", "outcome");
CREATE INDEX "StaffComplianceRecord_staffMemberId_type_idx"
ON "StaffComplianceRecord"("staffMemberId", "type");
CREATE INDEX "StaffComplianceRecord_organisationId_expiryDate_idx"
ON "StaffComplianceRecord"("organisationId", "expiryDate");
CREATE INDEX "StaffComplianceRecord_organisationId_nextDueDate_idx"
ON "StaffComplianceRecord"("organisationId", "nextDueDate");

ALTER TABLE "StaffMember"
ADD CONSTRAINT "StaffMember_organisationId_fkey"
FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffMember"
ADD CONSTRAINT "StaffMember_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffComplianceRecord"
ADD CONSTRAINT "StaffComplianceRecord_organisationId_fkey"
FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffComplianceRecord"
ADD CONSTRAINT "StaffComplianceRecord_staffMemberId_fkey"
FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffComplianceRecord"
ADD CONSTRAINT "StaffComplianceRecord_verifiedById_fkey"
FOREIGN KEY ("verifiedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "description")
VALUES
  (md5('permission:workforce:view')::uuid, 'workforce:view', 'View authorised staff compliance, training and competency records.'),
  (md5('permission:workforce:manage')::uuid, 'workforce:manage', 'Add and update workforce compliance records.')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" role
JOIN "Permission" permission ON permission."key" = 'workforce:view'
WHERE role."key" IN (
  'organisation-owner',
  'nominated-individual',
  'registered-manager',
  'quality-compliance-manager'
)
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" role
JOIN "Permission" permission ON permission."key" = 'workforce:manage'
WHERE role."key" IN (
  'organisation-owner',
  'registered-manager',
  'quality-compliance-manager'
)
ON CONFLICT DO NOTHING;

WITH definitions(id, key, name, description, sort_order, fields) AS (
  VALUES
  (
    md5('register-definition:care-plan-reviews')::uuid,
    'care-plan-reviews',
    'Care-plan reviews',
    'Care-plan review dates, involvement, changes, outcomes and follow-up.',
    21,
    '[{"key":"personReference","label":"Person reference","type":"text","required":true},{"key":"reviewDueDate","label":"Review due date","type":"date"},{"key":"reviewCompletedDate","label":"Review completed date","type":"date"},{"key":"personInvolved","label":"Person involved in review","type":"boolean"},{"key":"representativeInvolved","label":"Representative involved","type":"boolean"},{"key":"changesRequired","label":"Changes required","type":"boolean"},{"key":"outcomes","label":"Outcomes and agreed changes","type":"textarea"}]'::jsonb
  ),
  (
    md5('register-definition:risk-assessment-reviews')::uuid,
    'risk-assessment-reviews',
    'Risk-assessment reviews',
    'Person-level risk-assessment review and renewal assurance.',
    22,
    '[{"key":"personReference","label":"Person reference","type":"text","required":true},{"key":"assessmentType","label":"Assessment type","type":"text","required":true},{"key":"reviewDueDate","label":"Review due date","type":"date"},{"key":"reviewCompletedDate","label":"Review completed date","type":"date"},{"key":"riskChanged","label":"Risk changed","type":"boolean"},{"key":"controlsUpdated","label":"Controls updated","type":"boolean"},{"key":"outcome","label":"Review outcome","type":"textarea"}]'::jsonb
  ),
  (
    md5('register-definition:mar-audits')::uuid,
    'mar-audits',
    'Medication and MAR audits',
    'Medication administration record audits, omissions, findings and improvement.',
    23,
    '[{"key":"samplePeriod","label":"Sample period","type":"text","required":true},{"key":"recordsSampled","label":"Records sampled","type":"number"},{"key":"omissions","label":"Unexplained omissions","type":"number"},{"key":"stockVariance","label":"Stock variance identified","type":"boolean"},{"key":"controlledDrugsIssue","label":"Controlled drugs issue","type":"boolean"},{"key":"score","label":"Compliance score (%)","type":"number"},{"key":"findings","label":"Findings and required action","type":"textarea"}]'::jsonb
  ),
  (
    md5('register-definition:delegated-healthcare')::uuid,
    'delegated-healthcare',
    'Delegated healthcare tasks',
    'Delegation, authorisation, competency and review of healthcare tasks.',
    24,
    '[{"key":"personReference","label":"Person reference","type":"text","required":true},{"key":"task","label":"Delegated task","type":"text","required":true},{"key":"delegatingProfessional","label":"Delegating professional","type":"text"},{"key":"authorisationDate","label":"Authorisation date","type":"date"},{"key":"reviewDate","label":"Review date","type":"date"},{"key":"competencyConfirmed","label":"Competency confirmed","type":"boolean"},{"key":"staffReferences","label":"Authorised staff references","type":"textarea"},{"key":"instructions","label":"Clinical instructions and escalation","type":"textarea"}]'::jsonb
  ),
  (
    md5('register-definition:service-user-outcomes')::uuid,
    'service-user-outcomes',
    'Service-user outcomes',
    'Goals, progress, review and evidence of outcomes for people using the service.',
    25,
    '[{"key":"personReference","label":"Person reference","type":"text","required":true},{"key":"outcomeArea","label":"Outcome area","type":"text","required":true},{"key":"goal","label":"Agreed goal","type":"textarea"},{"key":"progress","label":"Progress and evidence","type":"textarea"},{"key":"personView","label":"Person''s view","type":"textarea"},{"key":"reviewDate","label":"Next review date","type":"date"}]'::jsonb
  ),
  (
    md5('register-definition:satisfaction-surveys')::uuid,
    'satisfaction-surveys',
    'Satisfaction surveys',
    'Service-user and representative survey results, themes and improvement actions.',
    26,
    '[{"key":"surveyType","label":"Survey audience","type":"text","required":true},{"key":"period","label":"Survey period","type":"text"},{"key":"responses","label":"Number of responses","type":"number"},{"key":"satisfactionScore","label":"Satisfaction score (%)","type":"number"},{"key":"positiveThemes","label":"What people valued","type":"textarea"},{"key":"improvementThemes","label":"What people want improved","type":"textarea"},{"key":"youSaidWeDid","label":"You said, we did response","type":"textarea"}]'::jsonb
  ),
  (
    md5('register-definition:business-continuity')::uuid,
    'business-continuity',
    'Business continuity',
    'Continuity plans, exercises, disruptions, lessons and recovery actions.',
    27,
    '[{"key":"scenario","label":"Scenario or disruption","type":"text","required":true},{"key":"planActivated","label":"Plan activated","type":"boolean"},{"key":"testOrLive","label":"Exercise or live event","type":"text"},{"key":"criticalServicesMaintained","label":"Critical services maintained","type":"boolean"},{"key":"recoveryTime","label":"Recovery time","type":"text"},{"key":"lessons","label":"Lessons identified","type":"textarea"},{"key":"nextTestDate","label":"Next exercise date","type":"date"}]'::jsonb
  ),
  (
    md5('register-definition:commissioner-contracts')::uuid,
    'commissioner-contracts',
    'Commissioner contracts',
    'Contract obligations, submissions, performance issues and commissioner actions.',
    28,
    '[{"key":"commissioner","label":"Commissioner","type":"text","required":true},{"key":"contractReference","label":"Contract reference","type":"text"},{"key":"reportingPeriod","label":"Reporting period","type":"text"},{"key":"submissionDueDate","label":"Submission due date","type":"date"},{"key":"submissionDate","label":"Submission date","type":"date"},{"key":"performanceIssue","label":"Performance issue identified","type":"boolean"},{"key":"commissionerFeedback","label":"Commissioner feedback","type":"textarea"},{"key":"requiredAction","label":"Required action","type":"textarea"}]'::jsonb
  )
)
INSERT INTO "RegisterDefinition" (
  "id",
  "organisationId",
  "key",
  "name",
  "description",
  "fieldSchema",
  "isPublished",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT id, NULL, key, name, description, fields, true, sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM definitions
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "fieldSchema" = EXCLUDED."fieldSchema",
  "isPublished" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;
