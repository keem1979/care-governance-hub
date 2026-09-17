\set ON_ERROR_STOP on

-- Fictional production-shaped records created on the committed baseline before
-- any of the Incident, Complaints or Safeguarding Assurance migrations exist.
INSERT INTO "Organisation" (id, name, slug, "updatedAt") VALUES
('13000000-0000-4000-8000-000000000001', 'Convergence Upgrade Care Ltd', 'convergence-upgrade-care', '2026-08-20T10:00:00Z');

INSERT INTO "User" (id, email, name, "passwordHash", "updatedAt") VALUES
('13000000-0000-4000-8000-000000000002', 'convergence-upgrade@example.invalid', 'Convergence Upgrade Manager', 'not-a-login-credential', '2026-08-20T10:00:00Z');

INSERT INTO "ServiceLocation" (id, "organisationId", name, code, "updatedAt") VALUES
('13000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000001', 'Convergence Upgrade Service', 'CVG-UPGRADE', '2026-08-20T10:00:00Z');

INSERT INTO "Client" (
  id, "organisationId", "locationId", "clientReference", "clientNumber", "firstName", "lastName", "updatedAt"
) VALUES (
  '13000000-0000-4000-8000-000000000004', '13000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000003', 'CVG-CLIENT-001', 1, 'Fictional', 'Resident', '2026-08-20T10:00:00Z'
);

INSERT INTO "StaffMember" (
  id, "organisationId", "locationId", "employeeReference", "staffNumber", "firstName", "lastName", "jobTitle", "updatedAt"
) VALUES (
  '13000000-0000-4000-8000-000000000005', '13000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000003', 'CVG-STAFF-001', 1, 'Fictional', 'Worker', 'Care Worker', '2026-08-20T10:00:00Z'
);

INSERT INTO "Evidence" (
  id, "organisationId", "locationId", title, category, "evidenceType", "ownerId", "uploadedById", "updatedAt"
) VALUES (
  '13000000-0000-4000-8000-000000000006', '13000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000003', 'Legacy governed evidence', 'Quality & Audit', 'Internal record',
  '13000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', '2026-08-20T10:00:00Z'
);

INSERT INTO "RegisterEntry" (
  id, "organisationId", "definitionId", "locationId", "clientId", "staffMemberId", reference, "eventDate",
  title, summary, "riskLevel", status, "ownerId", data, "createdById", "updatedAt"
)
SELECT
  CASE definition.key
    WHEN 'incidents' THEN '13000000-0000-4000-8000-000000000090'::uuid
    WHEN 'complaints' THEN '13000000-0000-4000-8000-000000000091'::uuid
    WHEN 'safeguarding' THEN '13000000-0000-4000-8000-000000000092'::uuid
  END,
  '13000000-0000-4000-8000-000000000001', definition.id,
  '13000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000004',
  '13000000-0000-4000-8000-000000000005',
  CASE definition.key WHEN 'incidents' THEN 'INC-CVG-001' WHEN 'complaints' THEN 'CMP-CVG-001' ELSE 'SG-CVG-001' END,
  '2026-08-20T09:00:00Z',
  CASE definition.key WHEN 'incidents' THEN 'Legacy linked incident' WHEN 'complaints' THEN 'Legacy linked complaint' ELSE 'Legacy linked safeguarding concern' END,
  'Fictional historical governance record used only for local convergence testing.',
  'HIGH', 'IN_REVIEW', '13000000-0000-4000-8000-000000000002',
  CASE definition.key
    WHEN 'incidents' THEN '{"incidentType":"Care delivery","immediateResponse":"Immediate support provided.","harmLevel":"Moderate harm"}'::jsonb
    WHEN 'complaints' THEN '{"complainantFirstName":"Fictional Representative","category":"Care quality","acknowledgementDate":"2026-08-21","targetResponseDate":"2026-09-10"}'::jsonb
    ELSE '{"category":"Neglect / acts of omission","immediateResponse":"Immediate concern controlled.","localAuthorityReferralDate":"2026-08-21"}'::jsonb
  END,
  '13000000-0000-4000-8000-000000000002', '2026-08-20T10:00:00Z'
FROM "RegisterDefinition" definition
WHERE definition."organisationId" IS NULL AND definition.key IN ('incidents', 'complaints', 'safeguarding');

INSERT INTO "RegisterEntryEvidence" ("entryId", "evidenceId")
SELECT id, '13000000-0000-4000-8000-000000000006'
FROM "RegisterEntry"
WHERE "organisationId" = '13000000-0000-4000-8000-000000000001';

INSERT INTO "Action" (
  id, "organisationId", "locationId", reference, title, description, "sourceType", "sourceRecordId", "sourceReference",
  "clientId", "staffMemberId", "ownerId", priority, "dueDate", "createdById", "updatedAt"
)
SELECT
  CASE entry.reference WHEN 'INC-CVG-001' THEN '13000000-0000-4000-8000-000000000080'::uuid WHEN 'CMP-CVG-001' THEN '13000000-0000-4000-8000-000000000081'::uuid ELSE '13000000-0000-4000-8000-000000000082'::uuid END,
  entry."organisationId", entry."locationId", replace(entry.reference, '001', 'ACTION-001'),
  'Legacy linked action for ' || entry.reference, 'Fictional improvement work retained through the assurance convergence upgrade.',
  CASE WHEN entry.reference LIKE 'INC-%' THEN 'INCIDENT'::"ActionSourceType" WHEN entry.reference LIKE 'CMP-%' THEN 'COMPLAINT'::"ActionSourceType" ELSE 'SAFEGUARDING'::"ActionSourceType" END,
  entry.id, entry.reference, entry."clientId", entry."staffMemberId", '13000000-0000-4000-8000-000000000002',
  'HIGH', '2026-09-20T10:00:00Z', '13000000-0000-4000-8000-000000000002', '2026-08-20T10:00:00Z'
FROM "RegisterEntry" entry
WHERE entry."organisationId" = '13000000-0000-4000-8000-000000000001';

INSERT INTO "ActionEvidence" (id, "actionId", "evidenceId", role, "linkedById")
SELECT gen_random_uuid(), id, '13000000-0000-4000-8000-000000000006', 'SOURCE', '13000000-0000-4000-8000-000000000002'
FROM "Action"
WHERE "organisationId" = '13000000-0000-4000-8000-000000000001';
