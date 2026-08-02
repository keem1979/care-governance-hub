INSERT INTO "Evidence" (
  "id", "organisationId", "locationId", "title", "description", "category",
  "evidenceType", "ownerId", "evidenceDate", "reviewExpiryDate", "tags", "relatedModule",
  "relatedRecordId", "confidentiality", "status", "notes", "archivedAt",
  "uploadedById", "createdAt", "updatedAt"
)
SELECT
  md5('meeting-evidence:' || meeting."id"::text)::uuid,
  meeting."organisationId",
  meeting."locationId",
  left('Governance meeting: ' || meeting."reference" || ' — ' || meeting."title", 180),
  meeting."meetingType" || '. ' || CASE WHEN meeting."status" = 'APPROVED' THEN 'Approved meeting record.' ELSE 'Live meeting record.' END,
  'Governance meetings',
  CASE WHEN meeting."status" = 'APPROVED' THEN 'Approved meeting minutes' ELSE 'Meeting record' END,
  meeting."chairId",
  meeting."meetingDate",
  meeting."nextMeetingDate",
  ARRAY['system-generated', 'governance-meeting', lower(meeting."reference"), 'meeting-status:' || lower(meeting."status"::text)],
  'GovernanceMeeting',
  meeting."id"::text,
  'CONFIDENTIAL'::"EvidenceConfidentiality",
  CASE WHEN meeting."status" = 'ARCHIVED' THEN 'ARCHIVED'::"EvidenceWorkflowStatus" ELSE 'ACTIVE'::"EvidenceWorkflowStatus" END,
  'Kept in sync with the Governance Meetings record. Open the source meeting for attendance, agenda, decisions, actions, minutes and approval.',
  CASE WHEN meeting."status" = 'ARCHIVED' THEN COALESCE(meeting."archivedAt", CURRENT_TIMESTAMP) ELSE NULL END,
  meeting."createdById",
  meeting."createdAt",
  CURRENT_TIMESTAMP
FROM "GovernanceMeeting" meeting
ON CONFLICT ("id") DO UPDATE SET
  "locationId" = EXCLUDED."locationId", "title" = EXCLUDED."title", "description" = EXCLUDED."description",
  "evidenceType" = EXCLUDED."evidenceType", "ownerId" = EXCLUDED."ownerId", "evidenceDate" = EXCLUDED."evidenceDate",
  "reviewExpiryDate" = EXCLUDED."reviewExpiryDate", "tags" = EXCLUDED."tags", "status" = EXCLUDED."status",
  "archivedAt" = EXCLUDED."archivedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "MeetingEvidence" ("meetingId", "evidenceId")
SELECT meeting."id", md5('meeting-evidence:' || meeting."id"::text)::uuid
FROM "GovernanceMeeting" meeting
ON CONFLICT ("meetingId", "evidenceId") DO NOTHING;
