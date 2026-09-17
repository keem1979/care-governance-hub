\set ON_ERROR_STOP on

BEGIN;

WITH tenant AS (
  SELECT id AS organisation_id FROM "Organisation" WHERE slug='meadow-view-home-care'
), actor AS (
  SELECT id AS user_id FROM "User" WHERE email='e2e-rm@release-gate.invalid'
), definition AS (
  SELECT id AS definition_id FROM "RegisterDefinition" WHERE key='complaints' AND "organisationId" IS NULL
), location AS (
  SELECT id AS location_id FROM "ServiceLocation" WHERE code='GUILDFORD' AND "organisationId"=(SELECT organisation_id FROM tenant)
)
INSERT INTO "RegisterEntry" (
  id,"organisationId","definitionId","locationId",reference,"eventDate",title,summary,
  "riskLevel",status,"ownerId",data,"createdById","updatedAt"
)
SELECT
  (substr(md5('complaint-performance-'||series),1,8)||'-'||substr(md5('complaint-performance-'||series),9,4)||'-4'||substr(md5('complaint-performance-'||series),14,3)||'-8'||substr(md5('complaint-performance-'||series),18,3)||'-'||substr(md5('complaint-performance-'||series),21,12))::uuid,
  tenant.organisation_id,definition.definition_id,location.location_id,
  'PERF-CMP-'||lpad(series::text,5,'0'),CURRENT_TIMESTAMP-(series||' minutes')::interval,
  'Synthetic Complaint oversight probe '||series,'Disposable local performance-probe record.',
  CASE WHEN series%20=0 THEN 'HIGH'::"RegisterRiskLevel" ELSE 'MEDIUM'::"RegisterRiskLevel" END,
  'IN_REVIEW'::"RegisterEntryStatus",actor.user_id,'{}'::jsonb,actor.user_id,CURRENT_TIMESTAMP
FROM generate_series(1,5000) series CROSS JOIN tenant CROSS JOIN actor CROSS JOIN definition CROSS JOIN location;

INSERT INTO "ComplaintInvestigation" (
  id,"organisationId","locationId","complaintId",status,category,"immediateSafetyConcern","triageSummary",
  "acknowledgementDueAt","responseDueAt","investigatorId","createdAt","updatedAt"
)
SELECT gen_random_uuid(),entry."organisationId",entry."locationId",entry.id,
  CASE WHEN right(entry.reference,1)='0' THEN 'COMPLETED'::"ComplaintInvestigationStatus" ELSE 'DRAFT'::"ComplaintInvestigationStatus" END,
  CASE WHEN right(entry.reference,1) IN ('1','2') THEN 'Communication' ELSE 'Care quality' END,
  'No immediate safety concern identified','Synthetic triage for index validation.',
  CURRENT_TIMESTAMP-interval '2 days',CURRENT_TIMESTAMP+interval '5 days',entry."ownerId",CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM "RegisterEntry" entry WHERE entry.reference LIKE 'PERF-CMP-%';

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*)
FROM "ComplaintInvestigation"
WHERE "organisationId"=(SELECT id FROM "Organisation" WHERE slug='meadow-view-home-care')
  AND "acknowledgementDueAt" < CURRENT_TIMESTAMP;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT category,finding,count(*)
FROM "ComplaintIssue"
WHERE "organisationId"=(SELECT id FROM "Organisation" WHERE slug='meadow-view-home-care')
GROUP BY category,finding;

ROLLBACK;
