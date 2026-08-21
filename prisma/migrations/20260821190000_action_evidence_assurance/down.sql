-- FORWARD RECOVERY ONLY.
--
-- Once more than one attributable Verification exists for an Action, the old
-- unique (actionId, verificationType) constraint cannot be restored without
-- deleting or merging legitimate governance history. Evidence relationship
-- retirement and explicit closure history have the same preservation duty.
-- Back up before deployment and correct defects with a forward migration. A
-- controlled backup restore is appropriate only before material new records
-- have been created.
DO $$
BEGIN
  RAISE EXCEPTION 'Action assurance migration is forward-recovery only; destructive rollback is intentionally disabled.';
END $$;
