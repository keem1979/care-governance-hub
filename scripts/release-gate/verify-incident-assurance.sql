\set ON_ERROR_STOP on

DO $$
DECLARE legacy_data jsonb;
DECLARE schema_fields jsonb;
BEGIN
  IF to_regclass('"IncidentInvestigation"') IS NULL OR to_regclass('"IncidentAssuranceReview"') IS NULL OR to_regclass('"IncidentAssuranceReviewEvidence"') IS NULL THEN
    RAISE EXCEPTION 'Incident Assurance tables are missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='IncidentInvestigation_incidentId_fkey' AND confdeltype='r') THEN
    RAISE EXCEPTION 'Incident investigation history is not protected by a restrictive foreign key';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='IncidentAssuranceReview_organisationId_incidentId_reviewed_idx') THEN
    RAISE EXCEPTION 'Incident assurance chronology index is missing';
  END IF;
  SELECT data INTO legacy_data FROM "RegisterEntry" WHERE reference='INC-LEGACY-001';
  IF legacy_data IS NOT NULL AND legacy_data <> '{"incidentType":"Care delivery","immediateResponse":"Immediate support was provided.","harmLevel":"Moderate harm","emergencyServices":false,"safeguardingReferral":false,"cqcNotification":true,"dutyOfCandour":true,"rootCause":"Legacy narrative retained.","learning":"Legacy learning retained."}'::jsonb THEN
    RAISE EXCEPTION 'Historical Incident data changed during upgrade';
  END IF;
  IF EXISTS (SELECT 1 FROM "IncidentInvestigation" i JOIN "RegisterEntry" r ON r.id=i."incidentId" WHERE r.reference='INC-LEGACY-001') THEN
    RAISE EXCEPTION 'Migration fabricated an investigation for a historical Incident';
  END IF;
  SELECT "fieldSchema" INTO schema_fields FROM "RegisterDefinition" WHERE key='incidents' AND "organisationId" IS NULL;
  IF jsonb_array_length(schema_fields) <> 7 OR schema_fields @> '[{"key":"rootCause"}]'::jsonb OR NOT schema_fields @> '[{"key":"cqcNotification","type":"select"}]'::jsonb THEN
    RAISE EXCEPTION 'Quick Incident capture schema was not upgraded safely';
  END IF;
END $$;
