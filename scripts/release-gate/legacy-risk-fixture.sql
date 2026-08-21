-- Fictional pre-framework records for the isolated PostgreSQL release gate.
-- Never run this fixture against a production database.
BEGIN;

INSERT INTO "Organisation" (id,name,slug,"updatedAt") VALUES
('10000000-0000-4000-8000-000000000001','Release Gate Care Ltd','release-gate-care',CURRENT_TIMESTAMP);
INSERT INTO "User" (id,email,name,"passwordHash","updatedAt") VALUES
('20000000-0000-4000-8000-000000000001','legacy.manager@release-gate.invalid','Legacy Fictional Manager','not-a-login-hash',CURRENT_TIMESTAMP);
INSERT INTO "Role" (id,key,name,description) VALUES
('30000000-0000-4000-8000-000000000001','release-gate-manager','Release Gate Manager','Fictional migration fixture role');
INSERT INTO "Permission" (id,key,description) VALUES
('40000000-0000-4000-8000-000000000001','governance:view','View governance records'),
('40000000-0000-4000-8000-000000000002','governance:edit','Edit governance records');
INSERT INTO "RolePermission" ("roleId","permissionId") VALUES
('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002');
INSERT INTO "OrganisationMembership" (id,"organisationId","userId","roleId",status,"allLocations","updatedAt") VALUES
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','ACTIVE',true,CURRENT_TIMESTAMP);
INSERT INTO "ServiceLocation" (id,"organisationId",name,code,"updatedAt") VALUES
('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Fictional Legacy Branch','RGB01',CURRENT_TIMESTAMP);

INSERT INTO "Risk" (id,"organisationId","locationId",reference,title,description,category,"existingControls",likelihood,impact,"initialScore","initialLevel","residualLikelihood","residualImpact","residualScore","residualLevel",appetite,"toleranceScore","reviewFrequency","nextReviewDate","ownerId","createdById","updatedAt") VALUES
('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','LEGACY-RSK-001','Legacy medicines assurance','Fictional Risk created before the organisation Framework existed.','Medicines','Legacy MAR checks and competency review.',4,4,16,'CRITICAL',2,4,8,'HIGH','LOW',9,'Monthly','2026-09-30','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',CURRENT_TIMESTAMP);
INSERT INTO "RiskReview" (id,"riskId","reviewedById","reviewDate",notes,likelihood,impact,score,level,"controlsEffective","nextReviewDate") VALUES
('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','2026-08-01','Historical fictional review retained across migration.',2,4,8,'HIGH',true,'2026-09-30');
INSERT INTO "Action" (id,"organisationId","locationId",reference,title,description,"sourceType","sourceRecordId","sourceReference","ownerId","dueDate","createdById","updatedAt") VALUES
('80000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','LEGACY-ACT-001','Retain legacy linked Action','Fictional Action linked to the legacy Risk.','RISK','70000000-0000-4000-8000-000000000001','LEGACY-RSK-001','20000000-0000-4000-8000-000000000001','2026-09-15','20000000-0000-4000-8000-000000000001',CURRENT_TIMESTAMP);
INSERT INTO "Evidence" (id,"organisationId",title,category,"evidenceType","ownerId","uploadedById","relatedModule","relatedRecordId","sourceReference","updatedAt") VALUES
('90000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Legacy fictional MAR audit','Audits','Record','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Risk','70000000-0000-4000-8000-000000000001','LEGACY-EVD-001',CURRENT_TIMESTAMP);
INSERT INTO "RiskEvidence" ("riskId","evidenceId") VALUES
('70000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001');
INSERT INTO "ActivityLog" (id,"organisationId","locationId","userId",action,"recordType","recordId",summary) VALUES
('a0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','CREATE','Risk','70000000-0000-4000-8000-000000000001','Historical fictional Risk activity');

COMMIT;
