import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") throw new Error("The performance gate requires the named disposable local database.");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query("BEGIN");
  const sql = readFileSync("scripts/release-gate/evidence-controls-performance.sql", "utf8").split(/\r?\n/).filter(line => !line.startsWith("\\")).join("\n");
  const results = await db.query(sql);
  const rows = await db.query('SELECT count(*)::int AS n FROM "Evidence" WHERE "sourceName"=$1', ["Release-gate performance fixture"]);
  if (rows.rows[0].n !== 5000) throw new Error("The Evidence probe did not use exactly 5,000 fictional rows.");
  const probes = results.filter(result => result.command === "EXPLAIN").map(result => {
    const line = result.rows.map(row => row["QUERY PLAN"]).find(value => value.startsWith("Execution Time:"));
    return Number(line?.match(/Execution Time: ([\d.]+) ms/)?.[1]);
  });
  if (probes.length !== 2 || probes.some(value => !Number.isFinite(value) || value > 250)) throw new Error(`Evidence search probes exceeded the 250 ms gate: ${probes.join(", ")}`);
  console.log(`WP004_EVIDENCE_PERFORMANCE_GATE PASS; 5,000 fictional rows; search ${probes[0]} ms; page ${probes[1]} ms`);
} finally {
  await db.query("ROLLBACK").catch(() => undefined);
  await db.end();
}
