\set ON_ERROR_STOP on
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Action" WHERE id='10000000-0000-4000-8000-000000000011' AND status='COMPLETED' AND "closedAt" IS NOT NULL AND "closedById"='10000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'Legacy Action or closure backfill was not preserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "ActionEvidence" WHERE "actionId"='10000000-0000-4000-8000-000000000011' AND "evidenceId"='10000000-0000-4000-8000-000000000021' AND role='LEGACY_UNSPECIFIED' AND "retiredAt" IS NULL AND "evidenceSnapshot" IS NULL) THEN
    RAISE EXCEPTION 'Legacy ActionEvidence was lost or its role was guessed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "Verification" WHERE id='10000000-0000-4000-8000-000000000060' AND outcome='VERIFIED') THEN
    RAISE EXCEPTION 'Verification decision was not preserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "EffectivenessReview" WHERE id='10000000-0000-4000-8000-000000000061' AND outcome='EFFECTIVE') THEN
    RAISE EXCEPTION 'Effectiveness review was not preserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "ExternalDependency" WHERE id='10000000-0000-4000-8000-000000000062' AND status='RESOLVED') THEN
    RAISE EXCEPTION 'External dependency was not preserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "Risk" WHERE id='10000000-0000-4000-8000-000000000010' AND "riskFrameworkVersionId"='10000000-0000-4000-8000-000000000071') THEN
    RAISE EXCEPTION 'Risk framework attribution was not preserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "RiskClosureAuthorityRule" WHERE id='10000000-0000-4000-8000-000000000072' AND "approverRoleKeys"=ARRAY['registered-manager','nominated-individual']) THEN
    RAISE EXCEPTION 'Provider closure authority policy was not preserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "ProviderControl" WHERE id='10000000-0000-4000-8000-000000000080' AND "currentVersionId"='10000000-0000-4000-8000-000000000081') THEN
    RAISE EXCEPTION 'Provider Control version was not preserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "ActivityLog" WHERE id='10000000-0000-4000-8000-000000000090' AND "recordType"='ActionClosure') THEN
    RAISE EXCEPTION 'Activity history was not preserved';
  END IF;
END $$;

-- Prove the former one-Verification-per-type uniqueness constraint has been
-- removed while keeping the original decision. Roll back the probe record.
BEGIN;
INSERT INTO "Verification" (
  id,"organisationId","locationId","actionId","verificationType",outcome,"completedWork",
  "evidenceSummary","evidenceIds","successMeasureResult","independenceConfirmed",rationale,
  "verifierId","verifiedAt","updatedAt"
) VALUES (
  '10000000-0000-4000-8000-000000000063','10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000011','CLOSURE','FAILED',
  'Correction assessed','Evidence rejected',ARRAY['10000000-0000-4000-8000-000000000021'],
  'Further correction required',false,'Append-only probe','10000000-0000-4000-8000-000000000002',
  '2026-08-21T09:00:00Z','2026-08-21T09:00:00Z'
);
DO $$ BEGIN
  IF (SELECT count(*) FROM "Verification" WHERE "actionId"='10000000-0000-4000-8000-000000000011' AND "verificationType"='CLOSURE') <> 2 THEN
    RAISE EXCEPTION 'Append-only Verification decisions are not supported';
  END IF;
END $$;
ROLLBACK;

SELECT 'ACTION_ASSURANCE_UPGRADE_PASS' AS result;
