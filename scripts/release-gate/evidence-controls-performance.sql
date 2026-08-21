\set ON_ERROR_STOP on
\timing on

DO $$
DECLARE
  org_id uuid;
  owner_id uuid;
  location_id uuid;
BEGIN
  SELECT id INTO org_id FROM "Organisation" WHERE slug='meadow-view-home-care';
  SELECT id INTO owner_id FROM "User" WHERE email='e2e-risk-owner@release-gate.invalid';
  SELECT id INTO location_id FROM "ServiceLocation" WHERE "organisationId"=org_id AND code='GUILDFORD';
  IF org_id IS NULL OR owner_id IS NULL OR location_id IS NULL THEN
    RAISE EXCEPTION 'Run the guarded E2E setup before the performance fixture';
  END IF;

  DELETE FROM "Evidence" WHERE "organisationId"=org_id AND "sourceName"='Release-gate performance fixture';
  INSERT INTO "Evidence" (
    id,"organisationId","locationId",title,description,category,"evidenceType","ownerId",tags,
    confidentiality,status,"uploadedById","updatedAt","sourceType","sourceName","sourceReference",
    "taxonomyFamilyKey","taxonomyTypeKey","taxonomyFamilySnapshot","taxonomyTypeSnapshot",
    "currentnessMode","currentnessStatus"
  )
  SELECT
    gen_random_uuid(),org_id,location_id,'Performance medicines Evidence '||n,
    'Synthetic release-gate row '||n,'Medicines','Audit evidence',owner_id,ARRAY['performance','medicines'],
    'INTERNAL','ACTIVE',owner_id,CURRENT_TIMESTAMP,'INTERNAL_RECORD','Release-gate performance fixture','PERF-'||lpad(n::text,6,'0'),
    'MEDICINES','MEDICATION_AUDIT','Medicines','Medication audit','HISTORICAL_NON_EXPIRING','CURRENT'
  FROM generate_series(1,5000) n;
END $$;

ANALYZE "Evidence";

EXPLAIN (ANALYZE,BUFFERS,FORMAT TEXT)
SELECT id,title,"taxonomyFamilySnapshot","taxonomyTypeSnapshot"
FROM "Evidence"
WHERE "organisationId"=(SELECT id FROM "Organisation" WHERE slug='meadow-view-home-care')
  AND status='ACTIVE'
  AND "taxonomyFamilyKey"='MEDICINES'
  AND "taxonomyTypeKey"='MEDICATION_AUDIT'
  AND (title ILIKE '%4999%' OR "sourceReference" ILIKE '%4999%')
ORDER BY "updatedAt" DESC
LIMIT 20;

EXPLAIN (ANALYZE,BUFFERS,FORMAT TEXT)
SELECT id,title
FROM "Evidence"
WHERE "organisationId"=(SELECT id FROM "Organisation" WHERE slug='meadow-view-home-care')
  AND status='ACTIVE'
ORDER BY "archivedAt" ASC,"reviewExpiryDate" ASC,title ASC
OFFSET 2376 LIMIT 24;
