CREATE TYPE "RegisterEntryStatus" AS ENUM ('OPEN','IN_REVIEW','AWAITING_ACTION','CLOSED','ARCHIVED');
CREATE TYPE "RegisterRiskLevel" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TABLE "RegisterDefinition" (
  "id" UUID NOT NULL,"organisationId" UUID,"key" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT,
  "fieldSchema" JSONB NOT NULL,"isPublished" BOOLEAN NOT NULL DEFAULT true,"sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegisterDefinition_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RegisterEntry" (
  "id" UUID NOT NULL,"organisationId" UUID NOT NULL,"definitionId" UUID NOT NULL,"locationId" UUID,
  "reference" TEXT NOT NULL,"eventDate" TIMESTAMP(3) NOT NULL,"title" TEXT NOT NULL,"summary" TEXT NOT NULL,
  "riskLevel" "RegisterRiskLevel" NOT NULL DEFAULT 'LOW',"status" "RegisterEntryStatus" NOT NULL DEFAULT 'OPEN',
  "ownerId" UUID,"data" JSONB NOT NULL,"linkedActionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],"closureDate" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),"createdById" UUID NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "RegisterEntry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RegisterEntryEvidence" ("entryId" UUID NOT NULL,"evidenceId" UUID NOT NULL,CONSTRAINT "RegisterEntryEvidence_pkey" PRIMARY KEY ("entryId","evidenceId"));
CREATE TABLE "RegisterEntryHistory" (
  "id" UUID NOT NULL,"entryId" UUID NOT NULL,"userId" UUID,"action" TEXT NOT NULL,"snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "RegisterEntryHistory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RegisterDefinition_organisationId_key_key" ON "RegisterDefinition"("organisationId","key");
CREATE INDEX "RegisterDefinition_isPublished_sortOrder_idx" ON "RegisterDefinition"("isPublished","sortOrder");
CREATE UNIQUE INDEX "RegisterEntry_organisationId_definitionId_reference_key" ON "RegisterEntry"("organisationId","definitionId","reference");
CREATE INDEX "RegisterEntry_organisationId_definitionId_status_idx" ON "RegisterEntry"("organisationId","definitionId","status");
CREATE INDEX "RegisterEntry_locationId_eventDate_idx" ON "RegisterEntry"("locationId","eventDate");
CREATE INDEX "RegisterEntryEvidence_evidenceId_idx" ON "RegisterEntryEvidence"("evidenceId");
CREATE INDEX "RegisterEntryHistory_entryId_createdAt_idx" ON "RegisterEntryHistory"("entryId","createdAt");
ALTER TABLE "RegisterDefinition" ADD CONSTRAINT "RegisterDefinition_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "RegisterDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegisterEntryEvidence" ADD CONSTRAINT "RegisterEntryEvidence_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "RegisterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegisterEntryEvidence" ADD CONSTRAINT "RegisterEntryEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegisterEntryHistory" ADD CONSTRAINT "RegisterEntryHistory_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "RegisterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegisterEntryHistory" ADD CONSTRAINT "RegisterEntryHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

WITH definitions(key,name,description,sort_order) AS (VALUES
('complaints','Complaints','Complaints, investigation, outcomes and learning.',1),('compliments','Compliments','Positive feedback and recognition.',2),
('incidents','Incidents','Incidents, immediate responses and learning.',3),('accidents','Accidents','Accidents and resulting follow-up.',4),
('near-misses','Near misses','Near misses and preventative learning.',5),('safeguarding','Safeguarding','Safeguarding concerns and referrals.',6),
('whistleblowing','Whistleblowing','Whistleblowing concerns and outcomes.',7),('cqc-notifications','CQC notifications','Notifications made or considered.',8),
('medicines-errors','Medicines errors','Medication errors and remedial action.',9),('falls','Falls','Falls, harm and prevention measures.',10),
('pressure-damage','Pressure damage','Pressure damage events and reviews.',11),('hospital-admissions','Hospital admissions','Hospital admissions and follow-up.',12),
('missed-visits','Missed visits','Missed care visits and responses.',13),('late-visits','Late visits','Late care visits and impact.',14),
('staff-concerns','Staff concerns','Staff-related concerns and reviews.',15),('service-user-feedback','Service-user feedback','Feedback from people using the service.',16),
('staff-feedback','Staff feedback','Workforce feedback and themes.',17),('training-exceptions','Training exceptions','Overdue or exceptional training records.',18),
('supervision-exceptions','Supervision exceptions','Overdue or exceptional supervision records.',19),('data-breaches','Data breaches','Information security and data incidents.',20)
)
INSERT INTO "RegisterDefinition" ("id","key","name","description","fieldSchema","isPublished","sortOrder","updatedAt")
SELECT md5('register-definition:'||key)::uuid,key,name,description,
CASE key
WHEN 'complaints' THEN '[{"key":"complainantFirstName","label":"Complainant first name","type":"text"},{"key":"personReference","label":"Person affected reference","type":"text"},{"key":"category","label":"Complaint category","type":"text"},{"key":"investigator","label":"Investigator","type":"text"},{"key":"acknowledgementDate","label":"Acknowledgement date","type":"date"},{"key":"targetResponseDate","label":"Target response date","type":"date"},{"key":"outcome","label":"Outcome","type":"textarea"},{"key":"dutyOfCandour","label":"Duty of Candour required","type":"boolean"},{"key":"externalReferral","label":"External referral","type":"boolean"},{"key":"learning","label":"Learning identified","type":"textarea"}]'::jsonb
WHEN 'incidents' THEN '[{"key":"personReference","label":"Person affected reference","type":"text"},{"key":"incidentType","label":"Incident type","type":"text"},{"key":"immediateResponse","label":"Immediate response","type":"textarea"},{"key":"harmLevel","label":"Injury or harm level","type":"text"},{"key":"emergencyServices","label":"Emergency services involved","type":"boolean"},{"key":"familyNotified","label":"Family notified","type":"boolean"},{"key":"safeguardingReferral","label":"Safeguarding referral required","type":"boolean"},{"key":"cqcNotification","label":"CQC notification required","type":"boolean"},{"key":"dutyOfCandour","label":"Duty of Candour required","type":"boolean"},{"key":"rootCause","label":"Root cause","type":"textarea"},{"key":"learning","label":"Learning","type":"textarea"}]'::jsonb
ELSE '[{"key":"personReference","label":"Person or staff reference","type":"text"},{"key":"category","label":"Category or type","type":"text"},{"key":"immediateResponse","label":"Immediate response","type":"textarea"},{"key":"outcome","label":"Outcome","type":"textarea"},{"key":"learning","label":"Learning identified","type":"textarea"}]'::jsonb END,
true,sort_order,CURRENT_TIMESTAMP FROM definitions;
