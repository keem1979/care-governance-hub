\set ON_ERROR_STOP on

DO $$
DECLARE legacy_data jsonb;
DECLARE schema_fields jsonb;
DECLARE investigation_count integer;
DECLARE communication_count integer;
BEGIN
  IF to_regclass('"ComplaintInvestigation"') IS NULL
    OR to_regclass('"ComplaintIssue"') IS NULL
    OR to_regclass('"ComplaintIssueEvidence"') IS NULL
    OR to_regclass('"ComplaintCommunication"') IS NULL
    OR to_regclass('"ComplaintAssuranceReview"') IS NULL
    OR to_regclass('"ComplaintAssuranceReviewEvidence"') IS NULL THEN
    RAISE EXCEPTION 'Complaints Assurance tables are missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ComplaintInvestigation_complaintId_fkey' AND confdeltype='r') THEN
    RAISE EXCEPTION 'Complaint investigation history is not protected by a restrictive foreign key';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ComplaintCommunication_organisationId_complaintId_occurredAt_idx') THEN
    RAISE EXCEPTION 'Complaint communication chronology index is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ComplaintAssuranceReview_organisationId_complaintId_reviewedAt_idx') THEN
    RAISE EXCEPTION 'Complaint assurance chronology index is missing';
  END IF;

  SELECT data INTO legacy_data FROM "RegisterEntry" WHERE reference='CMP-LEGACY-001';
  IF legacy_data IS NOT NULL AND legacy_data <> '{"complainantFirstName":"Fictional Pat","category":"Care quality","investigator":"Legacy Manager","acknowledgementDate":"2026-08-21","targetResponseDate":"2026-09-10","outcome":"Legacy outcome retained.","dutyOfCandour":true,"externalReferral":false,"learning":"Legacy learning retained."}'::jsonb THEN
    RAISE EXCEPTION 'Historical Complaint data changed during upgrade';
  END IF;

  SELECT count(*) INTO investigation_count
  FROM "ComplaintInvestigation" investigation
  JOIN "RegisterEntry" complaint ON complaint.id=investigation."complaintId"
  WHERE complaint.reference='CMP-LEGACY-001'
    AND investigation."complainantName"='Fictional Pat'
    AND investigation.category='Care quality'
    AND investigation."legacyInvestigator"='Legacy Manager'
    AND investigation."investigationOutcome"='Legacy outcome retained.'
    AND investigation.learning='Legacy learning retained.'
    AND investigation."responseDueAt"::date='2026-09-10'::date;
  IF legacy_data IS NOT NULL AND investigation_count <> 1 THEN
    RAISE EXCEPTION 'Legacy Complaint was not mapped into the typed investigation correctly';
  END IF;

  SELECT count(*) INTO communication_count
  FROM "ComplaintCommunication" communication
  JOIN "RegisterEntry" complaint ON complaint.id=communication."complaintId"
  WHERE complaint.reference='CMP-LEGACY-001'
    AND communication.type='ACKNOWLEDGEMENT'
    AND communication."occurredAt"::date='2026-08-21'::date;
  IF legacy_data IS NOT NULL AND communication_count <> 1 THEN
    RAISE EXCEPTION 'Legacy Complaint acknowledgement was not preserved as append-only communication';
  END IF;

  SELECT "fieldSchema" INTO schema_fields FROM "RegisterDefinition" WHERE key='complaints' AND "organisationId" IS NULL;
  IF jsonb_array_length(schema_fields) <> 7
    OR NOT schema_fields @> '[{"key":"category","type":"select"}]'::jsonb
    OR NOT schema_fields @> '[{"key":"immediateSafetyConcern","type":"select"}]'::jsonb THEN
    RAISE EXCEPTION 'Quick Complaint capture schema was not upgraded safely';
  END IF;
END $$;
