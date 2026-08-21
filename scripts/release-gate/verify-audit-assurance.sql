DO $$
DECLARE criterion TEXT; fieldwork TIMESTAMP; policies INTEGER; rules INTEGER;
BEGIN
  IF to_regclass('public."AuditFindingEvidence"') IS NULL OR to_regclass('public."AuditReaudit"') IS NULL OR to_regclass('public."ActionAssurancePolicyVersion"') IS NULL THEN
    RAISE EXCEPTION 'Audit assurance tables are missing';
  END IF;
  IF EXISTS (SELECT 1 FROM "AuditFinding" WHERE "criterionKeySnapshot" IS NULL OR btrim("criterionKeySnapshot")='') THEN
    RAISE EXCEPTION 'Audit Finding criterion identity was not backfilled';
  END IF;
  SELECT "criterionKeySnapshot" INTO criterion FROM "AuditFinding" WHERE "id"='ab000000-0000-4000-8000-000000000006';
  IF criterion IS NOT NULL AND criterion <> 'e2e-upgrade-medicines:S2:Q4' THEN RAISE EXCEPTION 'Unexpected criterion key: %', criterion; END IF;
  SELECT "fieldworkCompletedAt" INTO fieldwork FROM "Audit" WHERE "id"='ab000000-0000-4000-8000-000000000004';
  IF criterion IS NOT NULL AND fieldwork IS NULL THEN RAISE EXCEPTION 'Historical fieldwork sign-off was not preserved'; END IF;
  SELECT count(*) INTO policies FROM information_schema.columns WHERE table_name='Audit' AND column_name IN ('fieldworkCompletedAt','governanceAssuredAt','governanceAssuranceRationale');
  IF policies <> 3 THEN RAISE EXCEPTION 'Audit assurance decision columns are incomplete'; END IF;
  SELECT count(*) INTO rules FROM pg_type WHERE typname IN ('AuditEvidenceRole','AuditReauditOutcome');
  IF rules <> 2 THEN RAISE EXCEPTION 'Audit assurance enums are incomplete'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND tablename='AuditFindingEvidence'
      AND indexname='AuditFindingEvidence_active_role_key'
      AND indexdef ILIKE '%WHERE ("retiredAt" IS NULL)%'
  ) THEN
    RAISE EXCEPTION 'Active Audit Finding Evidence role uniqueness is missing';
  END IF;
END $$;
