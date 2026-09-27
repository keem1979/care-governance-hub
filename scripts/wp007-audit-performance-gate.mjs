import "dotenv/config";
import { performance } from "node:perf_hooks";
import pg from "pg";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") {
  throw new Error("The Audit performance gate requires the named disposable local database.");
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query("BEGIN");
  const fixture = await db.query(`
    SELECT o.id AS organisation_id, l.id AS location_id, u.id AS auditor_id,
      t.id AS template_id, t.version AS template_version
    FROM "Organisation" o
    JOIN "ServiceLocation" l ON l."organisationId" = o.id AND l.code = 'GUILDFORD'
    JOIN "User" u ON u.email = 'e2e-risk-owner@release-gate.invalid'
    JOIN "AuditTemplate" t ON t.key = 'medicines-audit' AND t."isPublished" = true
    WHERE o.slug = 'meadow-view-home-care' AND o."isDemo" = true
    LIMIT 1
  `);
  if (fixture.rowCount !== 1) throw new Error("Guarded fictional E2E setup is required before the Audit probe.");
  const { organisation_id: organisationId, location_id: locationId, auditor_id: auditorId, template_id: templateId, template_version: templateVersion } = fixture.rows[0];
  await db.query(`
    INSERT INTO "Audit" (id, "organisationId", "templateId", "templateVersion", "auditorId", "locationId", title, "auditDate", status, "updatedAt")
    SELECT gen_random_uuid(), $1, $2, $3, $4, $5, 'WP007 fictional Audit ' || n, CURRENT_DATE, 'IN_PROGRESS', CURRENT_TIMESTAMP
    FROM generate_series(1, 5000) n
  `, [organisationId, templateId, templateVersion, auditorId, locationId]);
  const durations = [];
  for (let i = 0; i < 3; i++) {
    const started = performance.now();
    const result = await db.query(`
      SELECT id, title, status, "updatedAt"
      FROM "Audit"
      WHERE "organisationId" = $1 AND "locationId" = $2 AND status NOT IN ('CLOSED', 'ARCHIVED')
      ORDER BY "updatedAt" DESC
    `, [organisationId, locationId]);
    const firstFive = result.rows.slice(0, 5);
    if (result.rowCount < 5000 || firstFive.length !== 5) throw new Error("Audit current-work selection did not process the 5,000-row fixture.");
    durations.push(Number((performance.now() - started).toFixed(3)));
  }
  if (durations.some((duration) => duration > 500)) throw new Error(`Audit current-work probe exceeded 500 ms: ${durations.join(", ")}`);
  console.log(`WP007_AUDIT_PERFORMANCE_GATE PASS; 5,000 fictional rows; scoped fetch and current-work selection ${durations.join(", ")} ms`);
} finally {
  await db.query("ROLLBACK").catch(() => undefined);
  await db.end();
}
