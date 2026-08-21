\set ON_ERROR_STOP on

DO $$
DECLARE
  missing_count integer;
  key_columns text[];
  unexpected_roles text[];
BEGIN
  SELECT count(*) INTO missing_count
  FROM (VALUES
    ('ProviderEvidenceType'),('ProviderControl'),('ProviderControlVersion'),
    ('ProviderControlVersionLocation'),('RiskControlApplication'),
    ('RiskControlEvidence'),('RiskControlEffectivenessReview')
  ) expected(name)
  WHERE to_regclass('public."'||expected.name||'"') IS NULL;
  IF missing_count <> 0 THEN RAISE EXCEPTION '% new tables are missing',missing_count; END IF;

  SELECT count(*) INTO missing_count
  FROM (VALUES
    ('taxonomyFamilyKey'),('taxonomyTypeKey'),('taxonomyFamilySnapshot'),('taxonomyTypeSnapshot'),
    ('providerEvidenceTypeId'),('currentnessMode'),('currentnessStatus')
  ) expected(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Evidence' AND column_name=expected.name
  );
  IF missing_count <> 0 THEN RAISE EXCEPTION '% Evidence columns are missing',missing_count; END IF;

  SELECT array_agg(a.attname ORDER BY x.ordinality) INTO key_columns
  FROM pg_constraint c
  CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY x(attnum,ordinality)
  JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=x.attnum
  WHERE c.contype='p' AND c.conrelid='"RiskEvidence"'::regclass;
  IF key_columns IS DISTINCT FROM ARRAY['riskId','evidenceId','role']::text[] THEN
    RAISE EXCEPTION 'RiskEvidence primary key is %, expected riskId/evidenceId/role',key_columns;
  END IF;

  SELECT array_agg(r.key ORDER BY r.key) INTO unexpected_roles
  FROM "RolePermission" rp
  JOIN "Role" r ON r.id=rp."roleId"
  JOIN "Permission" p ON p.id=rp."permissionId"
  WHERE p.key='controls:manage'
    AND r.key NOT IN ('organisation-owner','registered-manager','quality-compliance-manager');
  IF unexpected_roles IS NOT NULL THEN
    RAISE EXCEPTION 'controls:manage was granted to unexpected roles: %',unexpected_roles;
  END IF;
END $$;

SELECT 'FRESH MIGRATION PASS' AS result,
       (SELECT count(*) FROM "Permission" WHERE key='controls:manage') AS permission_count,
       (SELECT count(*) FROM "RolePermission" rp JOIN "Permission" p ON p.id=rp."permissionId" WHERE p.key='controls:manage') AS authorised_role_count;
