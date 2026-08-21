DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Risk" WHERE reference='LEGACY-RSK-001' AND "residualScore"=8 AND appetite='LOW' AND "toleranceScore"=9) THEN RAISE EXCEPTION 'Legacy Risk score/appetite/tolerance changed'; END IF;
  IF EXISTS (SELECT 1 FROM "Risk" WHERE reference='LEGACY-RSK-001' AND ("riskFrameworkVersionId" IS NOT NULL OR "riskFrameworkRuleId" IS NOT NULL)) THEN RAISE EXCEPTION 'Framework provenance was fabricated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "RiskReview" rr JOIN "Risk" r ON r.id=rr."riskId" WHERE r.reference='LEGACY-RSK-001' AND rr.score=8) THEN RAISE EXCEPTION 'Legacy Risk Review missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "Action" WHERE "sourceType"='RISK' AND "sourceRecordId"='70000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Legacy Action link missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "RiskEvidence" WHERE "riskId"='70000000-0000-4000-8000-000000000001' AND "evidenceId"='90000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Legacy Evidence link missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "ActivityLog" WHERE id='a0000000-0000-4000-8000-000000000001' AND summary='Historical fictional Risk activity') THEN RAISE EXCEPTION 'Legacy ActivityLog missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "OrganisationMembership" m JOIN "RolePermission" rp ON rp."roleId"=m."roleId" JOIN "Permission" p ON p.id=rp."permissionId" WHERE m.id='50000000-0000-4000-8000-000000000001' AND p.key='governance:edit') THEN RAISE EXCEPTION 'Legacy permissions missing'; END IF;
END $$;

SELECT 'LEGACY_PRESERVATION_PASS' AS result;
