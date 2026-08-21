\set ON_ERROR_STOP on
BEGIN;

-- Deliberately uses the schema immediately before the Evidence taxonomy slice.
-- The strings below are legacy production-shaped values and must remain byte-for-byte unchanged.
INSERT INTO "Organisation" (id,name,slug,"updatedAt") VALUES
('10000000-0000-4000-8000-000000000001','Release Gate Care Ltd','release-gate-care','2026-08-20T10:00:00Z');

INSERT INTO "User" (id,email,name,"passwordHash","updatedAt") VALUES
('10000000-0000-4000-8000-000000000002','release-gate@example.invalid','Release Gate Manager','not-a-login-credential','2026-08-20T10:00:00Z');

INSERT INTO "ServiceLocation" (id,"organisationId",name,code,"updatedAt") VALUES
('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Meadow Test Service','MEADOW-TEST','2026-08-20T10:00:00Z');

INSERT INTO "Risk" (
 id,"organisationId","locationId",reference,title,description,category,"existingControls",
 likelihood,impact,"initialScore","initialLevel","ownerId","residualLikelihood","residualImpact",
 "residualScore","residualLevel","reviewFrequency","nextReviewDate","createdById","updatedAt"
) VALUES (
 '10000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000003','RSK-LEGACY-001','Legacy medicines risk',
 'Missed medicines administration may cause harm.','Medicines','MAR audit and competency checks.',
 4,4,16,'HIGH','10000000-0000-4000-8000-000000000002',3,4,12,'HIGH','Monthly',
 '2026-09-20T10:00:00Z','10000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z'
);

INSERT INTO "Action" (
 id,"organisationId","locationId",reference,title,description,"sourceType","sourceRecordId","sourceReference",
 "ownerId",priority,"dueDate","createdById","updatedAt"
) VALUES (
 '10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000003','ACT-LEGACY-001','Reassess medicines competency',
 'Complete and verify a current medicines competency assessment.','RISK',
 '10000000-0000-4000-8000-000000000010','RSK-LEGACY-001','10000000-0000-4000-8000-000000000002',
 'HIGH','2026-09-01T10:00:00Z','10000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z'
);

INSERT INTO "Evidence" (
 id,"organisationId","locationId",title,description,category,"evidenceType","ownerId","evidenceDate",
 "reviewExpiryDate",tags,"relatedModule","relatedRecordId",confidentiality,status,notes,"uploadedById","updatedAt",
 "sourceType","sourceName","sourceReference","provenanceNote"
) VALUES
('10000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','July medicines audit','Legacy audit evidence','Medicines','Audit evidence','10000000-0000-4000-8000-000000000002','2026-07-31','2026-10-31',ARRAY['medicines','monthly'],'Risk','10000000-0000-4000-8000-000000000010','INTERNAL','ACTIVE','Exact legacy Risk evidence','10000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z','INTERNAL_RECORD','Risk Register','RSK-LEGACY-001','Captured before structured taxonomy'),
('10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Medicines competency record','Legacy action evidence','Training','Certificate','10000000-0000-4000-8000-000000000002','2026-08-01','2027-08-01',ARRAY['competency','staff'],'Action','10000000-0000-4000-8000-000000000011','CONFIDENTIAL','ACTIVE','Exact legacy Action evidence','10000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z','UPLOADED_DOCUMENT','Workforce','ACT-LEGACY-001','Captured before structured taxonomy'),
('10000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000001',NULL,'Medicines policy v6','Legacy policy link','Policies','Report','10000000-0000-4000-8000-000000000002','2026-04-01','2027-04-01',ARRAY['policy'],'Policy','10000000-0000-4000-8000-000000000030','INTERNAL','ACTIVE','Exact legacy Policy evidence','10000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z','INTERNAL_RECORD','Policy Library','POL-006','Captured before structured taxonomy'),
('10000000-0000-4000-8000-000000000023','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Quarterly quality audit','Legacy audit link','Audits','Report','10000000-0000-4000-8000-000000000002','2026-06-30',NULL,ARRAY['audit'],'Audit','10000000-0000-4000-8000-000000000031','INTERNAL','ACTIVE','Exact legacy Audit evidence','10000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z','INTERNAL_RECORD','Audit Centre','AUD-031','Captured before structured taxonomy'),
('10000000-0000-4000-8000-000000000024','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Medication refresher attendance','Legacy training link','Training','Certificate','10000000-0000-4000-8000-000000000002','2026-07-15','2027-07-15',ARRAY['training'],'Training','10000000-0000-4000-8000-000000000032','CONFIDENTIAL','ARCHIVED','Exact legacy Training evidence','10000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z','UPLOADED_DOCUMENT','Training Matrix','TRN-032','Captured before structured taxonomy');

INSERT INTO "EvidenceVersion" (id,"evidenceId","versionNumber","storageKey","fileName","contentType","sizeBytes",checksum,"changeNotes","uploadedById") VALUES
('10000000-0000-4000-8000-000000000040','10000000-0000-4000-8000-000000000020','1.0','release-gate/med-audit-v1.pdf','med-audit-v1.pdf','application/pdf',12345,'checksum-v1','Original','10000000-0000-4000-8000-000000000002'),
('10000000-0000-4000-8000-000000000041','10000000-0000-4000-8000-000000000020','2.0','release-gate/med-audit-v2.pdf','med-audit-v2.pdf','application/pdf',12500,'checksum-v2','Approved correction','10000000-0000-4000-8000-000000000002'),
('10000000-0000-4000-8000-000000000042','10000000-0000-4000-8000-000000000021','1.0','release-gate/competency.pdf','competency.pdf','application/pdf',9800,'checksum-competency',NULL,'10000000-0000-4000-8000-000000000002');

UPDATE "Evidence" SET "currentVersionId"='10000000-0000-4000-8000-000000000041' WHERE id='10000000-0000-4000-8000-000000000020';
UPDATE "Evidence" SET "currentVersionId"='10000000-0000-4000-8000-000000000042' WHERE id='10000000-0000-4000-8000-000000000021';

INSERT INTO "EvidenceVerification" (
 id,"organisationId","locationId","evidenceId","evidenceVersionId",outcome,relevance,"currencyAssessment",
 "authenticityCheck",limitations,"reviewDueAt","verifiedById","verifiedAt"
) VALUES (
 '10000000-0000-4000-8000-000000000050','10000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000020',
 '10000000-0000-4000-8000-000000000041','VERIFIED_WITH_LIMITATIONS','Relevant to July medicines assurance',
 'Current at verification date','Checksum and source reviewed','Sample size limited','2026-10-31',
 '10000000-0000-4000-8000-000000000002','2026-08-20T11:00:00Z'
);

INSERT INTO "RiskEvidence" ("riskId","evidenceId") VALUES
('10000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000020');
INSERT INTO "ActionEvidence" ("actionId","evidenceId") VALUES
('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000021');

COMMIT;
