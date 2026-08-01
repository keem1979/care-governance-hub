import "dotenv/config";
import pg from "pg";

const organisationId = process.env.RESET_KPI_ORGANISATION_ID;
const confirmation = process.env.RESET_KPI_CONFIRMATION;
if (!organisationId || confirmation !== `RESET:${organisationId}`) {
  throw new Error("Set RESET_KPI_ORGANISATION_ID and RESET_KPI_CONFIRMATION=RESET:<organisation-id>.");
}

const client = new pg.Client({ connectionString: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const organisation = await client.query('SELECT "id", "name" FROM "Organisation" WHERE "id" = $1 FOR UPDATE', [organisationId]);
  if (organisation.rowCount !== 1) throw new Error("The exact organisation was not found.");

  const entries = await client.query('SELECT * FROM "KpiEntry" WHERE "organisationId" = $1 ORDER BY "createdAt"', [organisationId]);
  const returns = await client.query('SELECT * FROM "KpiReturn" WHERE "organisationId" = $1 ORDER BY "createdAt"', [organisationId]);
  const evidence = await client.query('SELECT ke.* FROM "KpiEvidence" ke JOIN "KpiEntry" e ON e."id" = ke."entryId" WHERE e."organisationId" = $1', [organisationId]);
  const backup = {
    resetAt: new Date().toISOString(),
    organisation: organisation.rows[0],
    entries: entries.rows,
    returns: returns.rows,
    evidenceLinks: evidence.rows,
  };
  await client.query(
    `INSERT INTO "ActivityLog" ("id","organisationId","action","recordType","recordId","summary","beforeValue","afterValue","createdAt")
     VALUES (gen_random_uuid(),$1::uuid,'ARCHIVE','KpiDataResetBackup',($1::uuid)::text,'KPI figures cleared at the organisation owner’s request',$2::jsonb,$3::jsonb,CURRENT_TIMESTAMP)`,
    [organisationId, JSON.stringify(backup), JSON.stringify({ entries: 0, returns: 0, evidenceLinks: 0 })],
  );
  await client.query('DELETE FROM "KpiEvidence" ke USING "KpiEntry" e WHERE ke."entryId" = e."id" AND e."organisationId" = $1', [organisationId]);
  await client.query('DELETE FROM "KpiEntry" WHERE "organisationId" = $1', [organisationId]);
  await client.query('DELETE FROM "KpiReturn" WHERE "organisationId" = $1', [organisationId]);
  await client.query("COMMIT");
  console.log(JSON.stringify({ organisation: organisation.rows[0].name, entriesRemoved: entries.rowCount, returnsRemoved: returns.rowCount, evidenceLinksRemoved: evidence.rowCount, recoverableFromActivityLog: true }));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
