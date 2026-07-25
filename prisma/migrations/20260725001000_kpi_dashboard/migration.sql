CREATE TYPE "KpiDirection" AS ENUM ('HIGHER_IS_BETTER','LOWER_IS_BETTER');
CREATE TYPE "KpiRagStatus" AS ENUM ('GREEN','AMBER','RED');

CREATE TABLE "KpiDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organisationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL,
  "direction" "KpiDirection" NOT NULL,
  "targetValue" DOUBLE PRECISION NOT NULL,
  "greenThreshold" DOUBLE PRECISION NOT NULL,
  "amberThreshold" DOUBLE PRECISION NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KpiDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiEntry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "kpiId" UUID NOT NULL,
  "reportingMonth" TIMESTAMP(3) NOT NULL,
  "actualValue" DOUBLE PRECISION NOT NULL,
  "targetValue" DOUBLE PRECISION NOT NULL,
  "greenThreshold" DOUBLE PRECISION NOT NULL,
  "amberThreshold" DOUBLE PRECISION NOT NULL,
  "ragStatus" "KpiRagStatus" NOT NULL,
  "notes" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KpiEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiEvidence" (
  "entryId" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  CONSTRAINT "KpiEvidence_pkey" PRIMARY KEY ("entryId","evidenceId")
);

CREATE UNIQUE INDEX "KpiDefinition_organisationId_slug_key" ON "KpiDefinition"("organisationId","slug");
CREATE INDEX "KpiDefinition_organisationId_isActive_sortOrder_idx" ON "KpiDefinition"("organisationId","isActive","sortOrder");
CREATE UNIQUE INDEX "KpiEntry_kpiId_locationId_reportingMonth_key" ON "KpiEntry"("kpiId","locationId","reportingMonth");
CREATE UNIQUE INDEX "KpiEntry_kpiId_reportingMonth_org_key" ON "KpiEntry"("kpiId","reportingMonth") WHERE "locationId" IS NULL;
CREATE INDEX "KpiEntry_organisationId_reportingMonth_ragStatus_idx" ON "KpiEntry"("organisationId","reportingMonth","ragStatus");
CREATE INDEX "KpiEntry_locationId_reportingMonth_idx" ON "KpiEntry"("locationId","reportingMonth");
CREATE INDEX "KpiEvidence_evidenceId_idx" ON "KpiEvidence"("evidenceId");
ALTER TABLE "KpiDefinition" ADD CONSTRAINT "KpiDefinition_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiEntry" ADD CONSTRAINT "KpiEntry_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiEntry" ADD CONSTRAINT "KpiEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiEntry" ADD CONSTRAINT "KpiEntry_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KpiDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiEntry" ADD CONSTRAINT "KpiEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KpiEvidence" ADD CONSTRAINT "KpiEvidence_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "KpiEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiEvidence" ADD CONSTRAINT "KpiEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "KpiDefinition" ("organisationId","name","slug","unit","direction","targetValue","greenThreshold","amberThreshold","sortOrder","updatedAt")
SELECT o."id", v.name, v.slug, v.unit, v.direction::"KpiDirection", v.target, v.green_value, v.amber_value, v.sort_order, CURRENT_TIMESTAMP
FROM "Organisation" o
CROSS JOIN (VALUES
('Care hours delivered','care-hours-delivered','hours','HIGHER_IS_BETTER',0,0,0,1),
('Missed visits','missed-visits','count','LOWER_IS_BETTER',0,0,2,2),
('Late visits','late-visits','count','LOWER_IS_BETTER',0,0,5,3),
('Medication errors','medication-errors','count','LOWER_IS_BETTER',0,0,1,4),
('Falls','falls','count','LOWER_IS_BETTER',0,0,2,5),
('Pressure damage','pressure-damage','count','LOWER_IS_BETTER',0,0,1,6),
('Hospital admissions','hospital-admissions','count','LOWER_IS_BETTER',0,0,2,7),
('Complaints','complaints','count','LOWER_IS_BETTER',0,0,2,8),
('Compliments','compliments','count','HIGHER_IS_BETTER',1,1,0,9),
('Safeguarding referrals','safeguarding-referrals','count','LOWER_IS_BETTER',0,0,1,10),
('Incidents','incidents','count','LOWER_IS_BETTER',0,0,3,11),
('Near misses','near-misses','count','LOWER_IS_BETTER',0,0,3,12),
('Staff turnover','staff-turnover','%','LOWER_IS_BETTER',10,10,15,13),
('Staff sickness','staff-sickness','%','LOWER_IS_BETTER',3,3,5,14),
('Vacancies','vacancies','count','LOWER_IS_BETTER',0,0,2,15),
('Training compliance','training-compliance','%','HIGHER_IS_BETTER',95,95,85,16),
('Supervision compliance','supervision-compliance','%','HIGHER_IS_BETTER',95,95,85,17),
('Appraisal compliance','appraisal-compliance','%','HIGHER_IS_BETTER',95,95,85,18),
('Spot-check compliance','spot-check-compliance','%','HIGHER_IS_BETTER',95,95,85,19),
('Care-plan reviews','care-plan-reviews','%','HIGHER_IS_BETTER',95,95,85,20),
('Risk assessments reviewed','risk-assessments-reviewed','%','HIGHER_IS_BETTER',95,95,85,21),
('Service-user satisfaction','service-user-satisfaction','%','HIGHER_IS_BETTER',90,90,80,22),
('Staff satisfaction','staff-satisfaction','%','HIGHER_IS_BETTER',85,85,75,23),
('Open actions','open-actions','count','LOWER_IS_BETTER',0,0,5,24),
('Overdue actions','overdue-actions','count','LOWER_IS_BETTER',0,0,2,25),
('Audit completion','audit-completion','%','HIGHER_IS_BETTER',100,100,90,26),
('Policy compliance','policy-compliance','%','HIGHER_IS_BETTER',100,100,90,27)
) AS v(name,slug,unit,direction,target,green_value,amber_value,sort_order);
