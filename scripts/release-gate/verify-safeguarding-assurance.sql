\set ON_ERROR_STOP on
DO $$ DECLARE legacy jsonb; DECLARE fields jsonb; DECLARE mapped integer; BEGIN
IF to_regclass('"SafeguardingCase"') IS NULL OR to_regclass('"SafeguardingEvent"') IS NULL OR to_regclass('"SafeguardingAssuranceReview"') IS NULL OR to_regclass('"SafeguardingAssuranceReviewEvidence"') IS NULL THEN RAISE EXCEPTION 'Safeguarding Assurance tables are missing'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='SafeguardingCase_safeguardingId_fkey' AND confdeltype='r') THEN RAISE EXCEPTION 'Safeguarding history is not protected'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='SafeguardingEvent_organisationId_safeguardingId_occurredAt_idx') THEN RAISE EXCEPTION 'Safeguarding chronology index missing'; END IF;
SELECT data INTO legacy FROM "RegisterEntry" WHERE reference='SG-LEGACY-001';
IF legacy IS NOT NULL AND legacy <> '{"category":"Neglect / acts of omission","immediateResponse":"Person supported and immediate concern controlled.","localAuthorityReferralDate":"2026-08-21","outcome":"Legacy outcome retained.","learning":"Legacy learning retained."}'::jsonb THEN RAISE EXCEPTION 'Historical safeguarding data changed'; END IF;
SELECT count(*) INTO mapped FROM "SafeguardingCase" c JOIN "RegisterEntry" e ON e.id=c."safeguardingId" WHERE e.reference='SG-LEGACY-001' AND c."safetyPosition"='CONTROLLED_IMMEDIATE_RISK' AND c."referralDecision"='MADE' AND c."referralDate"::date='2026-08-21';
IF legacy IS NOT NULL AND mapped<>1 THEN RAISE EXCEPTION 'Legacy safeguarding mapping failed'; END IF;
SELECT "fieldSchema" INTO fields FROM "RegisterDefinition" WHERE key='safeguarding' AND "organisationId" IS NULL;
IF jsonb_array_length(fields)<>3 OR NOT fields @> '[{"key":"safetyPosition","type":"select"}]'::jsonb THEN RAISE EXCEPTION 'Fast safeguarding capture schema missing'; END IF;
END $$;
