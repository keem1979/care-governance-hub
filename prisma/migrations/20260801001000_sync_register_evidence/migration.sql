INSERT INTO "Evidence" (
  "id", "organisationId", "locationId", "title", "description", "category",
  "evidenceType", "ownerId", "evidenceDate", "tags", "relatedModule",
  "relatedRecordId", "confidentiality", "status", "notes", "archivedAt",
  "uploadedById", "createdAt", "updatedAt"
)
SELECT
  md5('register-evidence:' || entry."id"::text)::uuid,
  entry."organisationId",
  entry."locationId",
  left(definition."name" || ': ' || entry."reference" || ' — ' || entry."title", 180),
  entry."summary",
  CASE definition."key"
    WHEN 'complaints' THEN 'Complaints'
    WHEN 'compliments' THEN 'Service-user feedback'
    WHEN 'incidents' THEN 'Incidents'
    WHEN 'accidents' THEN 'Incidents'
    WHEN 'near-misses' THEN 'Incidents'
    WHEN 'safeguarding' THEN 'Safeguarding'
    WHEN 'cqc-notifications' THEN 'CQC notifications'
    WHEN 'medicines-errors' THEN 'Medicines'
    WHEN 'falls' THEN 'Incidents'
    WHEN 'pressure-damage' THEN 'Incidents'
    WHEN 'data-breaches' THEN 'Incidents'
    WHEN 'service-user-feedback' THEN 'Service-user feedback'
    WHEN 'staff-feedback' THEN 'Staff feedback'
    WHEN 'training-exceptions' THEN 'Training'
    WHEN 'supervision-exceptions' THEN 'Supervision'
    WHEN 'business-continuity' THEN 'Business continuity'
    WHEN 'care-plan-reviews' THEN 'Audits'
    WHEN 'risk-assessment-reviews' THEN 'Audits'
    WHEN 'mar-audits' THEN 'Medicines'
    WHEN 'delegated-healthcare' THEN 'Competencies'
    WHEN 'service-user-outcomes' THEN 'Quality improvement'
    WHEN 'satisfaction-surveys' THEN 'Service-user feedback'
    WHEN 'commissioner-contracts' THEN 'Quality improvement'
    ELSE 'Other'
  END,
  'Record',
  COALESCE(entry."ownerId", entry."createdById"),
  entry."eventDate",
  ARRAY['system-generated', 'register', 'register:' || definition."key", lower(entry."reference")],
  'RegisterEntry',
  entry."id"::text,
  'CONFIDENTIAL'::"EvidenceConfidentiality",
  CASE WHEN entry."status" = 'ARCHIVED' THEN 'ARCHIVED'::"EvidenceWorkflowStatus" ELSE 'ACTIVE'::"EvidenceWorkflowStatus" END,
  'Kept in sync automatically with the ' || definition."name" || ' register. Open the source record for its full history and supporting documents.',
  CASE WHEN entry."status" = 'ARCHIVED' THEN COALESCE(entry."archivedAt", CURRENT_TIMESTAMP) ELSE NULL END,
  entry."createdById",
  entry."createdAt",
  CURRENT_TIMESTAMP
FROM "RegisterEntry" entry
JOIN "RegisterDefinition" definition ON definition."id" = entry."definitionId"
ON CONFLICT ("id") DO UPDATE SET
  "locationId" = EXCLUDED."locationId",
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "ownerId" = EXCLUDED."ownerId",
  "evidenceDate" = EXCLUDED."evidenceDate",
  "tags" = EXCLUDED."tags",
  "status" = EXCLUDED."status",
  "notes" = EXCLUDED."notes",
  "archivedAt" = EXCLUDED."archivedAt",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RegisterEntryEvidence" ("entryId", "evidenceId")
SELECT entry."id", md5('register-evidence:' || entry."id"::text)::uuid
FROM "RegisterEntry" entry
ON CONFLICT ("entryId", "evidenceId") DO NOTHING;
