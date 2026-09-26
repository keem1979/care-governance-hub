import "dotenv/config";
import { spawnSync } from "node:child_process";
import pg from "pg";

const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || url.port !== "5432" || url.pathname !== "/care_governance_hub_test") {
  throw new Error("Fresh migration gate requires the named disposable local database.");
}
const schema = "wp003a_fresh_migration_gate";
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
await admin.connect();
let created = false;
try {
  const existing = await admin.query("SELECT 1 FROM pg_namespace WHERE nspname=$1", [schema]);
  if (existing.rowCount) throw new Error("Fresh migration schema already exists; refusing to overwrite it.");
  await admin.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  const isolated = new URL(url);
  isolated.searchParams.set("schema", schema);
  const run = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: isolated.toString() }, encoding: "utf8", windowsHide: true,
  });
  if (run.status !== 0) throw new Error(`Fresh migration failed (exit ${run.status}): ${(run.stderr || run.stdout).slice(-2500)}`);
  const migrations = await admin.query(`SELECT count(*)::int AS count FROM "${schema}"."_prisma_migrations" WHERE finished_at IS NOT NULL`);
  const column = await admin.query("SELECT column_default FROM information_schema.columns WHERE table_schema=$1 AND table_name='RegisterEntry' AND column_name='riskLevel'", [schema]);
  if (!column.rows[0]?.column_default?.includes("UNASSESSED")) throw new Error("Fresh RegisterEntry default is not UNASSESSED.");
  console.log(`WP-003A fresh migration gate PASS: ${migrations.rows[0].count} applied migrations; RegisterEntry defaults to UNASSESSED.`);
} finally {
  if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.end();
}
