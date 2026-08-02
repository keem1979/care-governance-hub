UPDATE "Policy"
SET "tags" = array_remove(array_remove("tags", 'premium policy'), 'source grounded')
WHERE "tags" @> ARRAY['premium policy']::TEXT[]
   OR "tags" @> ARRAY['source grounded']::TEXT[];
