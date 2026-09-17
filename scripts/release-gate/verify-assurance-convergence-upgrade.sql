\set ON_ERROR_STOP on

DO $$
DECLARE
  register_count integer;
  register_evidence_count integer;
  action_count integer;
  action_evidence_count integer;
  wrong_scope_count integer;
BEGIN
  SELECT count(*) INTO register_count
  FROM "RegisterEntry"
  WHERE "organisationId" = '13000000-0000-4000-8000-000000000001'
    AND "locationId" = '13000000-0000-4000-8000-000000000003'
    AND "clientId" = '13000000-0000-4000-8000-000000000004'
    AND "staffMemberId" = '13000000-0000-4000-8000-000000000005'
    AND reference IN ('INC-CVG-001', 'CMP-CVG-001', 'SG-CVG-001');
  IF register_count <> 3 THEN
    RAISE EXCEPTION 'Legacy Incident, Complaint or Safeguarding identity/scope links were not preserved';
  END IF;

  SELECT count(*) INTO register_evidence_count
  FROM "RegisterEntryEvidence" link
  JOIN "RegisterEntry" entry ON entry.id = link."entryId"
  JOIN "Evidence" evidence ON evidence.id = link."evidenceId"
  WHERE entry."organisationId" = '13000000-0000-4000-8000-000000000001'
    AND evidence."organisationId" = entry."organisationId"
    AND evidence."locationId" = entry."locationId";
  IF register_evidence_count <> 3 THEN
    RAISE EXCEPTION 'Legacy governed Evidence links were not preserved';
  END IF;

  SELECT count(*) INTO action_count
  FROM "Action" action
  JOIN "RegisterEntry" entry ON entry.id = action."sourceRecordId"
  WHERE action."organisationId" = '13000000-0000-4000-8000-000000000001'
    AND action."organisationId" = entry."organisationId"
    AND action."locationId" = entry."locationId"
    AND action."clientId" = entry."clientId"
    AND action."staffMemberId" = entry."staffMemberId"
    AND action."sourceReference" = entry.reference
    AND action."sourceType"::text IN ('INCIDENT', 'COMPLAINT', 'SAFEGUARDING');
  IF action_count <> 3 THEN
    RAISE EXCEPTION 'Legacy canonical Action source, Client, Staff or scope links were not preserved';
  END IF;

  SELECT count(*) INTO action_evidence_count
  FROM "ActionEvidence" link
  JOIN "Action" action ON action.id = link."actionId"
  JOIN "Evidence" evidence ON evidence.id = link."evidenceId"
  WHERE action."organisationId" = '13000000-0000-4000-8000-000000000001'
    AND evidence."organisationId" = action."organisationId"
    AND link.role = 'SOURCE';
  IF action_evidence_count <> 3 THEN
    RAISE EXCEPTION 'Legacy canonical Action Evidence links were not preserved';
  END IF;

  SELECT count(*) INTO wrong_scope_count
  FROM (
    SELECT investigation."organisationId", entry."organisationId" AS entry_organisation
    FROM "IncidentInvestigation" investigation JOIN "RegisterEntry" entry ON entry.id = investigation."incidentId"
    UNION ALL
    SELECT investigation."organisationId", entry."organisationId"
    FROM "ComplaintInvestigation" investigation JOIN "RegisterEntry" entry ON entry.id = investigation."complaintId"
    UNION ALL
    SELECT safeguarding."organisationId", entry."organisationId"
    FROM "SafeguardingCase" safeguarding JOIN "RegisterEntry" entry ON entry.id = safeguarding."safeguardingId"
  ) scoped
  WHERE scoped."organisationId" <> scoped.entry_organisation;
  IF wrong_scope_count <> 0 THEN
    RAISE EXCEPTION 'An assurance migration attached typed data to the wrong tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "ComplaintInvestigation" investigation
    JOIN "RegisterEntry" entry ON entry.id = investigation."complaintId"
    WHERE entry.reference = 'CMP-CVG-001' AND investigation."complainantName" = 'Fictional Representative'
  ) THEN
    RAISE EXCEPTION 'Legacy Complaint typed mapping was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "SafeguardingCase" safeguarding
    JOIN "RegisterEntry" entry ON entry.id = safeguarding."safeguardingId"
    WHERE entry.reference = 'SG-CVG-001' AND safeguarding."referralDecision" = 'MADE'
  ) THEN
    RAISE EXCEPTION 'Legacy Safeguarding typed mapping was not created';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "IncidentInvestigation" investigation
    JOIN "RegisterEntry" entry ON entry.id = investigation."incidentId"
    WHERE entry.reference = 'INC-CVG-001'
  ) THEN
    RAISE EXCEPTION 'Incident migration fabricated an investigation for a legacy record';
  END IF;
END $$;
