CREATE TYPE "CqcKeyQuestion" AS ENUM ('SAFE','EFFECTIVE','CARING','RESPONSIVE','WELL_LED');
CREATE TYPE "InspectionEvidenceStatus" AS ENUM ('NO_EVIDENCE','LIMITED_EVIDENCE','EVIDENCE_AVAILABLE','EVIDENCE_REVIEWED','IMPROVEMENT_REQUIRED');
CREATE TABLE "ComplianceRequirement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),"organisationId" UUID NOT NULL,"locationId" UUID,
  "keyQuestion" "CqcKeyQuestion" NOT NULL,"qualityStatement" TEXT,"title" TEXT NOT NULL,"explanation" TEXT NOT NULL,
  "evidenceExamples" TEXT[] DEFAULT ARRAY[]::TEXT[],"ownerId" UUID,"reviewDate" TIMESTAMP(3),
  "evidenceStatus" "InspectionEvidenceStatus" NOT NULL DEFAULT 'NO_EVIDENCE',"confidenceNote" TEXT,"createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceRequirement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ComplianceRequirementEvidence" ("requirementId" UUID NOT NULL,"evidenceId" UUID NOT NULL,CONSTRAINT "ComplianceRequirementEvidence_pkey" PRIMARY KEY ("requirementId","evidenceId"));
CREATE TABLE "ComplianceRequirementAudit" ("requirementId" UUID NOT NULL,"auditId" UUID NOT NULL,CONSTRAINT "ComplianceRequirementAudit_pkey" PRIMARY KEY ("requirementId","auditId"));
CREATE TABLE "ComplianceRequirementRegister" ("requirementId" UUID NOT NULL,"registerEntryId" UUID NOT NULL,CONSTRAINT "ComplianceRequirementRegister_pkey" PRIMARY KEY ("requirementId","registerEntryId"));
CREATE TABLE "ComplianceRequirementAction" ("requirementId" UUID NOT NULL,"actionId" UUID NOT NULL,CONSTRAINT "ComplianceRequirementAction_pkey" PRIMARY KEY ("requirementId","actionId"));
CREATE INDEX "ComplianceRequirement_organisationId_keyQuestion_evidenceStatus_idx" ON "ComplianceRequirement"("organisationId","keyQuestion","evidenceStatus");
CREATE INDEX "ComplianceRequirement_organisationId_reviewDate_idx" ON "ComplianceRequirement"("organisationId","reviewDate");
CREATE INDEX "ComplianceRequirement_locationId_idx" ON "ComplianceRequirement"("locationId");
CREATE INDEX "ComplianceRequirement_ownerId_idx" ON "ComplianceRequirement"("ownerId");
CREATE INDEX "ComplianceRequirementEvidence_evidenceId_idx" ON "ComplianceRequirementEvidence"("evidenceId");
CREATE INDEX "ComplianceRequirementAudit_auditId_idx" ON "ComplianceRequirementAudit"("auditId");
CREATE INDEX "ComplianceRequirementRegister_registerEntryId_idx" ON "ComplianceRequirementRegister"("registerEntryId");
CREATE INDEX "ComplianceRequirementAction_actionId_idx" ON "ComplianceRequirementAction"("actionId");
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementEvidence" ADD CONSTRAINT "ComplianceRequirementEvidence_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementEvidence" ADD CONSTRAINT "ComplianceRequirementEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementAudit" ADD CONSTRAINT "ComplianceRequirementAudit_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementAudit" ADD CONSTRAINT "ComplianceRequirementAudit_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementRegister" ADD CONSTRAINT "ComplianceRequirementRegister_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementRegister" ADD CONSTRAINT "ComplianceRequirementRegister_registerEntryId_fkey" FOREIGN KEY ("registerEntryId") REFERENCES "RegisterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementAction" ADD CONSTRAINT "ComplianceRequirementAction_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirementAction" ADD CONSTRAINT "ComplianceRequirementAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ComplianceRequirement" ("organisationId","keyQuestion","qualityStatement","title","explanation","evidenceExamples","createdById","updatedAt")
SELECT o."id",v.key_question::"CqcKeyQuestion",v.statement,v.title,v.explanation,v.examples,creator."userId",CURRENT_TIMESTAMP
FROM "Organisation" o
JOIN LATERAL (SELECT m."userId" FROM "OrganisationMembership" m WHERE m."organisationId"=o."id" AND m."status"='ACTIVE' ORDER BY m."joinedAt" LIMIT 1) creator ON true
CROSS JOIN (VALUES
('SAFE','Learning culture','Learning from incidents','Show how incidents, near misses and concerns are reported, reviewed and used to improve care.',ARRAY['Incident register','Investigation records','Lessons learned briefings']),
('SAFE','Safeguarding','Safeguarding people from abuse','Demonstrate effective safeguarding identification, reporting, escalation and learning.',ARRAY['Safeguarding register','Referral records','Training evidence']),
('SAFE','Safe and effective staffing','Safe staffing and recruitment','Demonstrate safe recruitment, staffing levels, induction and competence.',ARRAY['Recruitment files','Rota audits','Competency records']),
('EFFECTIVE','Assessing needs','Assessment and care planning','Show that needs, risks and preferences are assessed and plans are reviewed.',ARRAY['Care-plan audits','Risk assessments','Review records']),
('EFFECTIVE','Evidence-based care','Policy and practice alignment','Demonstrate that care follows current guidance, policy and professional standards.',ARRAY['Approved policies','Audit results','Staff briefings']),
('EFFECTIVE','Staff development','Training, supervision and appraisal','Show that staff receive effective training, supervision, appraisal and support.',ARRAY['Training matrix','Supervision records','Appraisal records']),
('CARING','Kindness, compassion and dignity','Respectful care','Demonstrate that people are treated with kindness, compassion, dignity and respect.',ARRAY['Feedback','Observation audits','Compliments']),
('CARING','Independence, choice and control','Person-centred involvement','Show that people are involved in decisions and supported to exercise choice and control.',ARRAY['Care plans','Consent records','Service-user feedback']),
('CARING','Responding to immediate needs','Responsive day-to-day support','Demonstrate prompt and compassionate responses when people need help or reassurance.',ARRAY['Call monitoring','Spot checks','Feedback']),
('RESPONSIVE','Person-centred care','Care adapted to changing needs','Show that care is personalised and adjusted when needs or circumstances change.',ARRAY['Review records','Change notifications','Care-plan versions']),
('RESPONSIVE','Listening to and involving people','Complaints and feedback','Demonstrate accessible complaints handling and learning from all forms of feedback.',ARRAY['Complaints register','Survey results','You said, we did actions']),
('RESPONSIVE','Care provision, integration and continuity','Continuity and coordination','Show how services coordinate care and maintain reliable continuity.',ARRAY['Handover records','Missed-visit reviews','Professional correspondence']),
('WELL_LED','Governance, management and sustainability','Effective governance','Demonstrate clear oversight, accountability, risk management and continuous improvement.',ARRAY['Governance minutes','Risk register','Action tracker']),
('WELL_LED','Freedom to speak up','Open and transparent culture','Show that staff can raise concerns safely and leaders respond appropriately.',ARRAY['Whistleblowing policy','Staff survey','Speak-up records']),
('WELL_LED','Partnerships and communities','Partnership working','Demonstrate constructive working with commissioners, professionals and communities.',ARRAY['Partnership minutes','Stakeholder feedback','Service reviews'])
) AS v(key_question,statement,title,explanation,examples);
