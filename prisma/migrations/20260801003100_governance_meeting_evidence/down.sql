DELETE FROM "MeetingEvidence"
WHERE "evidenceId" IN (SELECT "id" FROM "Evidence" WHERE "relatedModule" = 'GovernanceMeeting');

DELETE FROM "Evidence" WHERE "relatedModule" = 'GovernanceMeeting';
