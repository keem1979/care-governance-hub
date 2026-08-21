\set ON_ERROR_STOP on
DO $$
DECLARE migration_count integer;
BEGIN
  SELECT count(*) INTO migration_count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;
  IF migration_count <> (SELECT count(*) FROM "_prisma_migrations") THEN
    RAISE EXCEPTION 'Fresh migration history contains unfinished entries';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ActionEvidence' AND column_name='role') OR
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ActionEvidence' AND column_name='retiredAt') OR
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Action' AND column_name='closedAt') THEN
    RAISE EXCEPTION 'Fresh Action assurance schema is incomplete';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='Verification' AND indexname='Verification_actionId_verificationType_verifiedAt_idx') THEN
    RAISE EXCEPTION 'Append-only Verification projection index is missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='Verification' AND indexname='Verification_actionId_verificationType_key') THEN
    RAISE EXCEPTION 'Legacy Verification uniqueness constraint remains';
  END IF;
END $$;
SELECT 'ACTION_ASSURANCE_FRESH_PASS' AS result;
