import "dotenv/config";
import { performance } from "node:perf_hooks";
import pg from "pg";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") {
  throw new Error("The inspection performance gate requires the named disposable local database.");
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
  if (fixture.rowCount !== 1) throw new Error("Guarded fictional E2E setup is required before the inspection probe.");
  const { organisation_id: organisationId, location_id: locationId, owner_id: ownerId } = fixture.rows[0];
  await db.query(`
    INSERT INTO "Risk" (
      id, "organisationId", "locationId", reference, title, description, category,
      "existingControls", likelihood, impact, "initialScore", "initialLevel",
      "residualLikelihood", "residualImpact", "residualScore", "residualLevel",
      "reviewFrequency", "nextReviewDate", "ownerId", "createdById", "updatedAt"
    )
    SELECT gen_random_uuid(), $1, $2, 'WP010-PERF-' || lpad(n::text, 5, '0'),
      'Fictional inspection risk ' || n, 'Disposable performance fixture', 'Care quality',
      'Fictional control', 4, 4, 16, 'HIGH', 3, 4, 12, 'HIGH',
      'Monthly', CURRENT_DATE - (n % 30), $3, $3, CURRENT_TIMESTAMP
    FROM generate_series(1, 5000) n
  `, [organisationId, locationId, ownerId]);

  const durations = [];
  let rowCount = 0;
  for (let run = 0; run < 3; run++) {
    const started = performance.now();
    const result = await db.query(`
      SELECT r.id, r.reference, r.title, r.status, r."residualLevel", r."nextReviewDate", l.name AS location_name
      FROM "Risk" r
      LEFT JOIN "ServiceLocation" l ON l.id = r."locationId"
      WHERE r."organisationId" = $1 AND r."archivedAt" IS NULL
        AND (r."locationId" IS NULL OR r."locationId" = $2)
        AND r.status NOT IN ('CLOSED', 'ARCHIVED') AND r."residualLevel" IN ('HIGH', 'CRITICAL')
      ORDER BY r."nextReviewDate" ASC
    `, [organisationId, locationId]);
    const rows = result.rows.map((item) => ({
      id: item.id, source: "High/Critical risk", href: `/risks/${item.id}`,
      title: `${item.reference} · ${item.title}`, status: item.status,
      dueAt: item.nextReviewDate, location: item.location_name ?? "Organisation-wide",
      dataCheckCount: 0, overdue: item.nextReviewDate < new Date(), seriousRiskLevel: item.residualLevel,
    }));
    if (rows.length < 5000 || rows.filter((item) => item.title.startsWith("WP010-PERF-")).length !== 5000) {
      throw new Error("The scoped compilation did not include all 5,000 fictional risk records.");
    }
    rowCount = rows.length;
    durations.push(Number((performance.now() - started).toFixed(3)));
  }
  if (durations.some((value) => value > 1000)) throw new Error(`Scoped compilation exceeded 1,000 ms: ${durations.join(", ")}`);
  console.log(`WP010_INSPECTION_PERFORMANCE_GATE PASS; 5,000 fictional rows; scoped compilation returned ${rowCount} rows in ${durations.join(", ")} ms`);
} finally {
  try {
    await db.query("ROLLBACK");
    const remaining = await db.query(`SELECT count(*)::int AS n FROM "Risk" WHERE reference LIKE 'WP010-PERF-%'`);
    if (remaining.rows[0].n !== 0) throw new Error("Fictional performance rows remain after rollback.");
    console.log("WP010 fictional performance fixture rollback verified.");
  } finally {
    await db.end();
  }
}
