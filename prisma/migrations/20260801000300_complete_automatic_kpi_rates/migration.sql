INSERT INTO "KpiDefinition" ("organisationId","name","slug","description","unit","direction","targetValue","greenThreshold","amberThreshold","sortOrder","updatedAt")
SELECT o."id", v.name, v.slug, v.description, '%', v.direction::"KpiDirection", v.target, v.green_value, v.amber_value, v.sort_order, CURRENT_TIMESTAMP
FROM "Organisation" o
CROSS JOIN (VALUES
  ('Orientation completion rate','orientation-completion-rate','Calculated automatically from staff eligible for and due to complete orientation.','HIGHER_IS_BETTER',100,100,90,141),
  ('Live-in staff supervision rate','live-in-supervision-rate','Calculated automatically from active live-in staff and those supervised.','HIGHER_IS_BETTER',100,100,90,142),
  ('Complaint closure rate','complaint-closure-rate','Calculated automatically from complaints open and complaints closed.','HIGHER_IS_BETTER',100,100,90,167)
) AS v(name,slug,description,direction,target,green_value,amber_value,sort_order)
ON CONFLICT ("organisationId","slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "unit" = EXCLUDED."unit",
    "direction" = EXCLUDED."direction",
    "targetValue" = EXCLUDED."targetValue",
    "greenThreshold" = EXCLUDED."greenThreshold",
    "amberThreshold" = EXCLUDED."amberThreshold",
    "sortOrder" = EXCLUDED."sortOrder",
    "isActive" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "KpiDefinition" AS d
SET "description" = v.description, "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
  ('scc-call-exception-rate','Calculated automatically from total, late, missed, rescheduled and cancelled care calls.'),
  ('scc-restart-acceptance-rate','Calculated automatically from restart offers and eligible restarts accepted.'),
  ('scc-new-staff-rate','Calculated automatically from new starters and total active staff.'),
  ('scc-care-certificate-rate','Calculated automatically from active staff and valid Care Certificates.'),
  ('scc-referral-response-rate','Calculated automatically from answered and unanswered referral requests.'),
  ('visits-within-agreed-time','Calculated automatically from total calls and recorded call exceptions.'),
  ('competency-compliance','Calculated automatically from competency checks due and completed.')
) AS v(slug,description)
WHERE d."slug" = v.slug;
