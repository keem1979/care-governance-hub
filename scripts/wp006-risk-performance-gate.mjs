import "dotenv/config";
import { performance } from "node:perf_hooks";
import pg from "pg";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") {
  throw new Error("The Risk performance gate requires the named disposable local database.");
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query("BEGIN");
  const fixture = await db.query(`
    SELECT o.id AS organisation_id, l.id AS location_id, u.id AS owner_id
    FROM "Organisation" o
    JOIN "ServiceLocation" l ON l."organisationId" = o.id AND l.code = 'GUILDFORD'
    JOIN "User" u ON u.email = 'e2e-risk-owner@release-gate.invalid'
    WHERE o.slug = 'meadow-view-home-care' AND o."isDemo" = true
  `);
  if (fixture.rowCount !== 1) throw new Error("Guarded fictional E2E setup is required before the Risk probe.");
  const { organisation_id: organisationId, location_id: locationId, owner_id: ownerId } = fixture.rows[0];
  await db.query(`
    INSERT INTO "Risk" (
      id, "organisationId", "locationId", reference, title, description, category,
      "existingControls", likelihood, impact, "initialScore", "initialLevel",
      "residualLikelihood", "residualImpact", "residualScore", "residualLevel",
      "toleranceScore", "reviewFrequency", "nextReviewDate", "ownerId", "createdById", "updatedAt"
    )
    SELECT gen_random_uuid(), $1, $2, 'WP006-PERF-' || lpad(n::text, 5, '0'),
      'Fictional Risk ' || n, 'Disposable performance fixture', 'Medicines',
      'Fictional control', 4, 4, 16, 'HIGH', 2, 3, 6, 'MODERATE',
      4, 'Monthly', CURRENT_DATE - (n % 30), $3, $3, CURRENT_TIMESTAMP
    FROM generate_series(1, 5000) n
  `, [organisationId, locationId, ownerId]);
  const count = await db.query(`SELECT count(*)::int AS n FROM "Risk" WHERE "organisationId"=$1 AND reference LIKE 'WP006-PERF-%'`, [organisationId]);
  if (count.rows[0].n !== 5000) throw new Error("The Risk probe did not create exactly 5,000 fictional rows.");

  const durations = [];
  for (let i = 0; i < 3; i++) {
    const started = performance.now();
    const result = await db.query(`
      SELECT id, reference, title, "nextReviewDate", "controlEffectiveness", "residualScore",
        "residualLevel", "toleranceScore", "ownerId", "targetDate", category,
        "frameworkToleranceSnapshot"
      FROM "Risk"
      WHERE "organisationId"=$1 AND "locationId"=$2 AND status NOT IN ('CLOSED','ARCHIVED')
    `, [organisationId, locationId]);
    const currentWork = result.rows.map(risk => ({
      risk,
      needsAttention: risk.residualLevel === "CRITICAL" || risk.residualLevel === "HIGH" ||
        risk.residualScore > (risk.toleranceScore ?? Infinity) ||
        new Date(risk.nextReviewDate) < new Date() || !risk.ownerId ||
        risk.controlEffectiveness === "NOT_TESTED",
    })).filter(item => item.needsAttention)
      .sort((a, b) => b.risk.residualScore - a.risk.residualScore)
      .slice(0, 5);
    if (result.rowCount < 5000 || currentWork.length !== 5) throw new Error("Risk current-work selection did not process the 5,000-row fixture.");
    durations.push(Number((performance.now() - started).toFixed(3)));
  }
  if (durations.some(duration => duration > 500)) throw new Error(`Risk current-work probe exceeded 500 ms: ${durations.join(", ")}`);
  console.log(`WP006_RISK_PERFORMANCE_GATE PASS; 5,000 fictional rows; scoped fetch and current-work selection ${durations.join(", ")} ms`);
} finally {
  await db.query("ROLLBACK").catch(() => undefined);
  await db.end();
}
