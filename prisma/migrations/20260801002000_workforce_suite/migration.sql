CREATE TYPE "StaffLeaveType" AS ENUM ('ANNUAL', 'SICKNESS', 'CARERS', 'DEPENDANT_EMERGENCY', 'MATERNITY', 'PATERNITY', 'ADOPTION', 'SHARED_PARENTAL', 'PARENTAL_BEREAVEMENT', 'COMPASSIONATE', 'STUDY', 'TOIL', 'UNPAID', 'OTHER');
CREATE TYPE "StaffLeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

ALTER TABLE "StaffMember"
  ADD COLUMN "profilePhotoKey" TEXT,
  ADD COLUMN "profilePhotoType" TEXT,
  ADD COLUMN "contractedDaysPerWeek" DECIMAL(4,2) NOT NULL DEFAULT 5,
  ADD COLUMN "annualLeaveEntitlementDays" DECIMAL(6,2) NOT NULL DEFAULT 28,
  ADD COLUMN "annualLeaveCarryOverDays" DECIMAL(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN "leaveYearStartMonth" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "leaveYearStartDay" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "StaffMember_profilePhotoKey_key" ON "StaffMember"("profilePhotoKey");

CREATE TABLE "TrainingCourse" (
  "id" UUID NOT NULL,
  "organisationId" UUID,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "suggestedRenewalMonths" INTEGER,
  "serviceSpecific" BOOLEAN NOT NULL DEFAULT false,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffTrainingRequirement" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "staffMemberId" UUID NOT NULL,
  "trainingCourseId" UUID NOT NULL,
  "requiredBy" TIMESTAMP(3),
  "exempt" BOOLEAN NOT NULL DEFAULT false,
  "exemptionReason" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffTrainingRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffLeaveRequest" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "staffMemberId" UUID NOT NULL,
  "type" "StaffLeaveType" NOT NULL,
  "status" "StaffLeaveStatus" NOT NULL DEFAULT 'PENDING',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "requestedDays" DECIMAL(6,2) NOT NULL,
  "reason" TEXT,
  "managerNote" TEXT,
  "fitNoteReceived" BOOLEAN NOT NULL DEFAULT false,
  "returnToWorkCompleted" BOOLEAN NOT NULL DEFAULT false,
  "requestedById" UUID NOT NULL,
  "decidedById" UUID,
  "decidedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffLeaveRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StaffComplianceRecord"
  ADD COLUMN "trainingCourseId" UUID,
  ADD COLUMN "evidenceId" UUID;

CREATE UNIQUE INDEX "TrainingCourse_organisationId_key_key" ON "TrainingCourse"("organisationId", "key");
CREATE INDEX "TrainingCourse_organisationId_category_idx" ON "TrainingCourse"("organisationId", "category");
CREATE INDEX "TrainingCourse_key_idx" ON "TrainingCourse"("key");
CREATE UNIQUE INDEX "StaffTrainingRequirement_staffMemberId_trainingCourseId_key" ON "StaffTrainingRequirement"("staffMemberId", "trainingCourseId");
CREATE INDEX "StaffTrainingRequirement_organisationId_archivedAt_idx" ON "StaffTrainingRequirement"("organisationId", "archivedAt");
CREATE INDEX "StaffTrainingRequirement_trainingCourseId_idx" ON "StaffTrainingRequirement"("trainingCourseId");
CREATE INDEX "StaffLeaveRequest_organisationId_status_startDate_idx" ON "StaffLeaveRequest"("organisationId", "status", "startDate");
CREATE INDEX "StaffLeaveRequest_staffMemberId_startDate_idx" ON "StaffLeaveRequest"("staffMemberId", "startDate");
CREATE INDEX "StaffComplianceRecord_staffMemberId_trainingCourseId_idx" ON "StaffComplianceRecord"("staffMemberId", "trainingCourseId");

ALTER TABLE "TrainingCourse" ADD CONSTRAINT "TrainingCourse_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffTrainingRequirement" ADD CONSTRAINT "StaffTrainingRequirement_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffTrainingRequirement" ADD CONSTRAINT "StaffTrainingRequirement_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffTrainingRequirement" ADD CONSTRAINT "StaffTrainingRequirement_trainingCourseId_fkey" FOREIGN KEY ("trainingCourseId") REFERENCES "TrainingCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffComplianceRecord" ADD CONSTRAINT "StaffComplianceRecord_trainingCourseId_fkey" FOREIGN KEY ("trainingCourseId") REFERENCES "TrainingCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffComplianceRecord" ADD CONSTRAINT "StaffComplianceRecord_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "TrainingCourse" ("id", "key", "title", "category", "description", "sourceName", "sourceUrl", "suggestedRenewalMonths", "serviceSpecific", "tags") VALUES
  (gen_random_uuid(), 'care-certificate-role', 'Understand your role', 'Care Certificate 2025', 'Roles, responsibilities, agreed ways of working and working relationships.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', NULL, false, ARRAY['induction','care-certificate']),
  (gen_random_uuid(), 'care-certificate-development', 'Personal development', 'Care Certificate 2025', 'Learning needs, development plans, feedback and reflective practice.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','development']),
  (gen_random_uuid(), 'care-certificate-duty', 'Duty of care', 'Care Certificate 2025', 'Duty of care, dilemmas, comments, complaints, incidents and errors.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','governance']),
  (gen_random_uuid(), 'care-certificate-equality', 'Equality, diversity, inclusion and human rights', 'Care Certificate 2025', 'Inclusive practice, protected rights and reducing discrimination.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','human-rights']),
  (gen_random_uuid(), 'care-certificate-person-centred', 'Work in a person-centred way', 'Care Certificate 2025', 'Person-centred values, plans, preferences and wellbeing.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','person-centred']),
  (gen_random_uuid(), 'care-certificate-communication', 'Communication', 'Care Certificate 2025', 'Communication needs, methods, barriers and confidentiality.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','communication']),
  (gen_random_uuid(), 'care-certificate-privacy', 'Privacy and dignity', 'Care Certificate 2025', 'Maintaining privacy, dignity and individual rights.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','dignity']),
  (gen_random_uuid(), 'care-certificate-nutrition', 'Fluids and nutrition', 'Care Certificate 2025', 'Hydration, nutrition and support appropriate to the role.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','nutrition']),
  (gen_random_uuid(), 'care-certificate-mental-health', 'Mental health, dementia and cognitive conditions', 'Care Certificate 2025', 'Awareness of mental health, dementia and cognitive conditions.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','mental-health','dementia']),
  (gen_random_uuid(), 'care-certificate-safeguarding-adults', 'Safeguarding adults', 'Care Certificate 2025', 'Recognising, responding to and reporting abuse or neglect.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','safeguarding']),
  (gen_random_uuid(), 'care-certificate-safeguarding-children', 'Safeguarding children', 'Care Certificate 2025', 'Awareness of safeguarding children appropriate to the role.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','safeguarding']),
  (gen_random_uuid(), 'care-certificate-basic-life-support', 'Basic life support', 'Care Certificate 2025', 'Role-appropriate emergency response and basic life support competency.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','clinical']),
  (gen_random_uuid(), 'care-certificate-health-safety', 'Health and safety', 'Care Certificate 2025', 'Workplace responsibilities, risk, fire, moving assistance and security.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','health-safety']),
  (gen_random_uuid(), 'care-certificate-information', 'Handling information', 'Care Certificate 2025', 'Secure, accurate and confidential handling of care information.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','information-governance']),
  (gen_random_uuid(), 'care-certificate-infection', 'Infection prevention and control', 'Care Certificate 2025', 'Infection risks, standard precautions and safe working practice.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','infection-control']),
  (gen_random_uuid(), 'care-certificate-ld-autism', 'Learning disability and autism awareness', 'Care Certificate 2025', 'Awareness, communication and reasonable adjustments for people with a learning disability and autistic people.', 'Skills for Care — Care Certificate standards 2025', 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', 12, false, ARRAY['induction','learning-disability','autism']),
  (gen_random_uuid(), 'medicines-support', 'Medicines support and competency', 'Role-specific care skills', 'Knowledge and observed competency for workers whose role includes medicines support.', 'CQC — Regulation 18 staffing', 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-18', 12, true, ARRAY['medicines','competency']),
  (gen_random_uuid(), 'moving-handling', 'Moving and assisting people', 'Role-specific care skills', 'Risk-assessed moving and assisting knowledge and practical competency.', 'CQC — Regulation 18 staffing', 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-18', 12, true, ARRAY['moving-handling','competency']),
  (gen_random_uuid(), 'mca-dols', 'Mental Capacity Act and restrictive practice', 'Role-specific care skills', 'Role-appropriate knowledge of capacity, consent, best interests and restrictions.', 'CQC — Regulation 18 staffing', 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-18', 12, true, ARRAY['capacity','consent']),
  (gen_random_uuid(), 'delegated-healthcare', 'Delegated healthcare task competency', 'Clinical competency', 'Task-specific training, observation, authorisation and review for delegated healthcare activities.', 'CQC — Regulation 18 staffing', 'https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-18', 12, true, ARRAY['delegated-healthcare','competency']);

INSERT INTO "StaffTrainingRequirement" ("id", "organisationId", "staffMemberId", "trainingCourseId")
SELECT gen_random_uuid(), s."organisationId", s."id", c."id"
FROM "StaffMember" s CROSS JOIN "TrainingCourse" c
WHERE c."organisationId" IS NULL AND c."serviceSpecific" = false AND s."archivedAt" IS NULL
ON CONFLICT ("staffMemberId", "trainingCourseId") DO NOTHING;
