\set ON_ERROR_STOP on

DO $$
DECLARE
  values_before text[][] := ARRAY[
    ARRAY['Medicines','Audit evidence','Risk','10000000-0000-4000-8000-000000000010','ACTIVE'],
    ARRAY['Training','Certificate','Action','10000000-0000-4000-8000-000000000011','ACTIVE'],
    ARRAY['Policies','Report','Policy','10000000-0000-4000-8000-000000000030','ACTIVE'],
    ARRAY['Audits','Report','Audit','10000000-0000-4000-8000-000000000031','ACTIVE'],
    ARRAY['Training','Certificate','Training','10000000-0000-4000-8000-000000000032','ARCHIVED']
  ];
  values_after text[][];
  version_count integer;
  verification_count integer;
  risk_link_count integer;
  action_link_count integer;
  role_value text;
BEGIN
  SELECT array_agg(ARRAY[category,"evidenceType",COALESCE("relatedModule",''),COALESCE("relatedRecordId",''),status::text] ORDER BY id)
  INTO values_after
  FROM "Evidence"
  WHERE id::text LIKE '10000000-0000-4000-8000-00000000002_';

  IF values_after IS DISTINCT FROM values_before THEN
    RAISE EXCEPTION 'Legacy Evidence strings/source links/status changed: %', values_after;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Evidence"
    WHERE id::text LIKE '10000000-0000-4000-8000-00000000002_'
      AND ("taxonomyFamilyKey" IS NOT NULL OR "taxonomyTypeKey" IS NOT NULL OR
           "taxonomyFamilySnapshot" IS NOT NULL OR "taxonomyTypeSnapshot" IS NOT NULL OR
           "providerEvidenceTypeId" IS NOT NULL OR "currentnessMode" IS NOT NULL OR "currentnessStatus" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Migration guessed a structured taxonomy/currentness value for legacy Evidence';
  END IF;

  SELECT count(*) INTO version_count FROM "EvidenceVersion" WHERE "evidenceId" IN (
    '10000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000021'
  );
  SELECT count(*) INTO verification_count FROM "EvidenceVerification" WHERE "evidenceId"='10000000-0000-4000-8000-000000000020';
  SELECT count(*), min(role::text) INTO risk_link_count, role_value FROM "RiskEvidence"
    WHERE "riskId"='10000000-0000-4000-8000-000000000010' AND "evidenceId"='10000000-0000-4000-8000-000000000020';
  SELECT count(*) INTO action_link_count FROM "ActionEvidence"
    WHERE "actionId"='10000000-0000-4000-8000-000000000011' AND "evidenceId"='10000000-0000-4000-8000-000000000021';

  IF version_count <> 3 OR verification_count <> 1 OR risk_link_count <> 1 OR action_link_count <> 1 OR role_value <> 'LEGACY_UNSPECIFIED' THEN
    RAISE EXCEPTION 'Legacy versions/verifications/joins were not preserved: versions %, verifications %, risk %, action %, role %',
      version_count, verification_count, risk_link_count, action_link_count, role_value;
  END IF;
END $$;

SELECT 'UPGRADE PRESERVATION PASS' AS result,
       count(*) AS legacy_evidence_records,
       count(*) FILTER (WHERE "taxonomyFamilyKey" IS NULL) AS safely_unclassified
FROM "Evidence"
WHERE id::text LIKE '10000000-0000-4000-8000-00000000002_';
