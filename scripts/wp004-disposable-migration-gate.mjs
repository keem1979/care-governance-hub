import "dotenv/config";
import { spawnSync } from "node:child_process";
import pg from "pg";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") {
  throw new Error("WP-004 migrations require the named disposable local database.");
}

const schema = `wp004_fresh_${process.pid}`;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let created = false;
try {
  await db.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  const scoped = new URL(destination);
  scoped.searchParams.set("schema", schema);
  const migrated = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: scoped.toString() },
    stdio: "inherit",
    windowsHide: true,
  });
  if (migrated.error || migrated.status !== 0) throw new Error(`Fresh disposable migration failed (${migrated.status ?? migrated.error?.message}).`);
  const verified = await db.query("SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema=$1 AND table_name IN ('Action','ActionEvidence','Verification','EffectivenessReview','_prisma_migrations')", [schema]);
  if (verified.rows[0].count !== 5) throw new Error("Fresh schema is missing a canonical Action assurance table or migration history.");
  console.log(`WP004_FRESH_MIGRATION_GATE PASS; canonical tables 5/5; isolated schema ${schema}`);
} finally {
  if (created) await db.query(`DROP SCHEMA "${schema}" CASCADE`);
  await db.end();
}
