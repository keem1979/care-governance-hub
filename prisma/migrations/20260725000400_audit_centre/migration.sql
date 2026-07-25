CREATE TYPE "AuditQuestionType" AS ENUM ('COMPLIANCE','YES_NO','TEXT','NUMBER','DATE','FILE','MULTIPLE_CHOICE');
CREATE TYPE "AuditStatus" AS ENUM ('DRAFT','IN_PROGRESS','AWAITING_REVIEW','COMPLETED','CLOSED','ARCHIVED');
CREATE TYPE "FindingSeverity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');

CREATE TABLE "AuditTemplate" (
  "id" UUID NOT NULL, "organisationId" UUID, "name" TEXT NOT NULL, "description" TEXT,
  "version" TEXT NOT NULL, "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditSection" (
  "id" UUID NOT NULL, "templateId" UUID NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "sortOrder" INTEGER NOT NULL, CONSTRAINT "AuditSection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditQuestion" (
  "id" UUID NOT NULL, "sectionId" UUID NOT NULL, "text" TEXT NOT NULL, "guidance" TEXT,
  "evidenceExpected" TEXT, "responseType" "AuditQuestionType" NOT NULL DEFAULT 'COMPLIANCE',
  "options" TEXT[] DEFAULT ARRAY[]::TEXT[], "weighting" INTEGER NOT NULL DEFAULT 1,
  "mandatory" BOOLEAN NOT NULL DEFAULT true, "requiresCommentNonCompliant" BOOLEAN NOT NULL DEFAULT true,
  "requiresEvidence" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "AuditQuestion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Audit" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "templateId" UUID NOT NULL,
  "templateVersion" TEXT NOT NULL, "auditorId" UUID NOT NULL, "locationId" UUID NOT NULL,
  "title" TEXT NOT NULL, "auditDate" TIMESTAMP(3) NOT NULL, "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3), "scope" TEXT, "status" "AuditStatus" NOT NULL DEFAULT 'DRAFT',
  "overallScore" DOUBLE PRECISION, "strengths" TEXT, "risks" TEXT, "recommendations" TEXT,
  "signedOffById" UUID, "signedOffAt" TIMESTAMP(3), "reviewDate" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditResponse" (
  "id" UUID NOT NULL, "auditId" UUID NOT NULL, "questionId" UUID NOT NULL, "answer" TEXT,
  "comment" TEXT, "score" DOUBLE PRECISION, "evidenceId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditResponse_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditFinding" (
  "id" UUID NOT NULL, "auditId" UUID NOT NULL, "responseId" UUID NOT NULL,
  "severity" "FindingSeverity" NOT NULL DEFAULT 'MEDIUM', "summary" TEXT NOT NULL,
  "recommendation" TEXT, "actionRequired" BOOLEAN NOT NULL DEFAULT false, "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditTemplate_organisationId_name_version_key" ON "AuditTemplate"("organisationId","name","version");
CREATE INDEX "AuditTemplate_organisationId_isPublished_idx" ON "AuditTemplate"("organisationId","isPublished");
CREATE UNIQUE INDEX "AuditSection_templateId_sortOrder_key" ON "AuditSection"("templateId","sortOrder");
CREATE UNIQUE INDEX "AuditQuestion_sectionId_sortOrder_key" ON "AuditQuestion"("sectionId","sortOrder");
CREATE INDEX "Audit_organisationId_status_idx" ON "Audit"("organisationId","status");
CREATE INDEX "Audit_organisationId_auditDate_idx" ON "Audit"("organisationId","auditDate");
CREATE INDEX "Audit_locationId_idx" ON "Audit"("locationId");
CREATE UNIQUE INDEX "AuditResponse_auditId_questionId_key" ON "AuditResponse"("auditId","questionId");
CREATE INDEX "AuditResponse_evidenceId_idx" ON "AuditResponse"("evidenceId");
CREATE UNIQUE INDEX "AuditFinding_responseId_key" ON "AuditFinding"("responseId");
CREATE INDEX "AuditFinding_auditId_severity_idx" ON "AuditFinding"("auditId","severity");

ALTER TABLE "AuditTemplate" ADD CONSTRAINT "AuditTemplate_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditSection" ADD CONSTRAINT "AuditSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AuditTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditQuestion" ADD CONSTRAINT "AuditQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AuditSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AuditTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_signedOffById_fkey" FOREIGN KEY ("signedOffById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditResponse" ADD CONSTRAINT "AuditResponse_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditResponse" ADD CONSTRAINT "AuditResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AuditQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditResponse" ADD CONSTRAINT "AuditResponse_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "AuditResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH names(name) AS (VALUES
('Governance audit'),('Policy audit'),('Staff-file audit'),('Recruitment audit'),('Training audit'),
('Supervision audit'),('Care-record audit'),('Medicines audit'),('MAR audit'),('Infection-control audit'),
('Health-and-safety audit'),('Complaints audit'),('Safeguarding audit'),('Incident audit'),
('Risk-management audit'),('Business-continuity audit'),('CQC notification audit'),
('Service-user feedback audit'),('Staff engagement audit'),('Data-protection audit')
)
INSERT INTO "AuditTemplate" ("id","name","description","version","isPublished","updatedAt")
SELECT md5('audit-template:'||name)::uuid, name, 'Starter template for consistent evidence-led review.', '1.0', true, CURRENT_TIMESTAMP FROM names;

INSERT INTO "AuditSection" ("id","templateId","title","description","sortOrder")
SELECT md5('audit-section:'||"id"::text)::uuid, "id", 'Core controls', 'Review the core controls and supporting evidence.', 1 FROM "AuditTemplate" WHERE "organisationId" IS NULL;

INSERT INTO "AuditQuestion" ("id","sectionId","text","guidance","evidenceExpected","responseType","weighting","mandatory","requiresCommentNonCompliant","requiresEvidence","sortOrder")
SELECT md5('audit-question:'||s."id"::text||':'||q.n)::uuid, s."id",
CASE q.n WHEN 1 THEN 'Is there a current documented process for this area?'
 WHEN 2 THEN 'Is responsibility clearly assigned and understood?'
 WHEN 3 THEN 'Does available evidence show the process is followed consistently?'
 WHEN 4 THEN 'Are exceptions, risks and learning recorded and acted upon?'
 ELSE 'Is this control reviewed at an appropriate frequency?' END,
'Select the most accurate response and explain any gap.','Current documents, records, monitoring evidence and recent examples.',
'COMPLIANCE', CASE WHEN q.n IN (1,3) THEN 2 ELSE 1 END, true, true, q.n = 3, q.n
FROM "AuditSection" s CROSS JOIN generate_series(1,5) AS q(n);
