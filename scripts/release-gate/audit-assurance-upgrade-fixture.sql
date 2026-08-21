-- Inserted after the preceding Action Assurance schema and before the Audit Assurance migration.
INSERT INTO "AuditTemplate" ("id","organisationId","key","name","description","category","standardRefs","frequency","serviceSpecific","version","isPublished","createdAt","updatedAt") VALUES
('ab000000-0000-4000-8000-000000000001',NULL,'e2e-upgrade-medicines','E2E upgrade Medicines audit','Historical template','Medicines',ARRAY['CQC Regulation 12'],'Monthly',false,'1.0',true,'2026-01-01','2026-01-01');
INSERT INTO "AuditSection" ("id","templateId","title","sortOrder") VALUES ('ab000000-0000-4000-8000-000000000002','ab000000-0000-4000-8000-000000000001','Medicines safety',2);
INSERT INTO "AuditQuestion" ("id","sectionId","text","responseType","weighting","mandatory","requiresCommentNonCompliant","requiresEvidence","sortOrder") VALUES
('ab000000-0000-4000-8000-000000000003','ab000000-0000-4000-8000-000000000002','Are MAR exceptions corrected and rechecked?','COMPLIANCE',3,true,true,true,4);
INSERT INTO "Audit" ("id","organisationId","templateId","templateVersion","auditorId","locationId","title","auditDate","status","overallScore","signedOffById","signedOffAt","createdAt","updatedAt") VALUES
('ab000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000001','1.0','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','E2E legacy completed Medicines audit','2026-07-01','COMPLETED',0,'10000000-0000-4000-8000-000000000002','2026-07-02','2026-07-01','2026-07-02');
INSERT INTO "AuditResponse" ("id","auditId","questionId","answer","comment","score","createdAt","updatedAt") VALUES
('ab000000-0000-4000-8000-000000000005','ab000000-0000-4000-8000-000000000004','ab000000-0000-4000-8000-000000000003','NON_COMPLIANT','A repeat exception was identified.',0,'2026-07-01','2026-07-01');
INSERT INTO "AuditFinding" ("id","auditId","responseId","severity","summary","recommendation","actionRequired","createdAt","updatedAt") VALUES
('ab000000-0000-4000-8000-000000000006','ab000000-0000-4000-8000-000000000004','ab000000-0000-4000-8000-000000000005','HIGH','MAR exception recurrence','Correct and re-audit.',true,'2026-07-01','2026-07-01');
