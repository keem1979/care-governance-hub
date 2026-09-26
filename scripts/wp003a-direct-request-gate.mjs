import "dotenv/config";
import pg from "pg";
import { E2E_SETUP_TOKEN, E2E_USERS } from "../tests/e2e/fixtures.ts";
import { generateTotp } from "../src/lib/auth/mfa.ts";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") {
  throw new Error("WP-003A direct gate requires the named disposable local database.");
}
const base = `http://127.0.0.1:${process.env.WP003A_TEST_PORT ?? "3104"}`;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const results = [];

async function login(user) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password, mfaCode: generateTotp(user.mfaSecret) }),
  });
  if (response.status !== 200) throw new Error(`Fictional account login failed (${response.status}).`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Authenticated test cookie was not issued.");
  return cookie;
}

async function request(cookie, path, fields, method = "POST") {
  const response = await fetch(`${base}${path}`, { method, headers: { Cookie: cookie }, body: new URLSearchParams(fields) });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

function expect(name, response, status, message) {
  const okay = response.status === status && (!message || String(response.body.error ?? "").includes(message));
  results.push({ name, okay, status: response.status });
  if (!okay) throw new Error(`${name}: got HTTP ${response.status} with ${JSON.stringify(response.body)}.`);
}

await db.connect();
try {
  const lookup = await fetch(`${base}/api/test/e2e/setup`, { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  if (!lookup.ok) throw new Error(`Fictional fixture lookup failed (${lookup.status}).`);
  const fixture = await lookup.json();
  const owner = await login(E2E_USERS.riskOwner);
  const other = await login(E2E_USERS.otherTenant);
  const restricted = await login(E2E_USERS.locationRestricted);
  const incidentId = fixture.incidents["E2E-INC-BLOCKED"].id;
  const otherOrg = (await db.query('SELECT id FROM "Organisation" WHERE slug=$1', ["release-gate-other-care"])).rows[0]?.id;
  const oxford = (await db.query('SELECT id FROM "ServiceLocation" WHERE code=$1', ["OXFORD"])).rows[0]?.id;
  if (!otherOrg || !oxford) throw new Error("Fictional tenant/location fixtures are incomplete.");
  const core = { title: "WP003A fictional direct request", summary: "Fictional direct-request validation only", riskLevel: "UNASSESSED", status: "OPEN" };
  const complaint = { ...core, field_category: "Communication", field_immediateSafetyConcern: "Unknown / evidence required" };

  expect("invalid risk vocabulary", await request(owner, "/api/registers/incidents", { ...core, riskLevel: "Low" }), 400, "valid status and risk");
  expect("governed create closed", await request(owner, "/api/registers/incidents", { ...core, status: "CLOSED" }), 400, "start open");
  expect("missing Safeguarding Client", await request(owner, "/api/registers/safeguarding", { ...core }), 400, "client");
  expect("unauthorised Client", await request(owner, "/api/registers/safeguarding", { ...core, clientId: "00000000-0000-4000-8000-000000000001" }), 400, "authorised client");
  expect("unauthorised location", await request(owner, "/api/registers/incidents", { ...core, locationId: "00000000-0000-4000-8000-000000000002" }), 400, "authorised location");
  expect("cross-tenant organisation identifier", await request(owner, "/api/registers/incidents", { ...core, organisationId: otherOrg }), 400, "Organisation scope");
  expect("direct closed status", await request(owner, `/api/registers/incidents/${incidentId}`, { ...core, riskLevel: "HIGH", status: "CLOSED" }, "PATCH"), 400, "controlled lifecycle");
  expect("direct closure date", await request(owner, `/api/registers/incidents/${incidentId}`, { ...core, closureDate: "2026-09-26" }, "PATCH"), 400, "Closure dates");
  expect("assessed open Incident archive", await request(owner, `/api/registers/incidents/${incidentId}`, { intent: "archive" }, "PATCH"), 400, "cannot be archived");
  expect("other tenant record identifier", await request(other, `/api/registers/incidents/${incidentId}`, core, "PATCH"), 404);
  expect("restricted other location", await request(restricted, "/api/registers/incidents", { ...core, locationId: fixture.audit.locationId }), 400, "authorised location");
  expect("restricted other-location record", await request(restricted, `/api/registers/incidents/${incidentId}`, core, "PATCH"), 404);

  const scoped = await request(restricted, "/api/registers/complaints", { ...complaint, reference: `E2E-CMP-WP003A-SCOPE-${Date.now()}`, locationId: "" });
  expect("single authorised location derived", scoped, 201);
  const scope = (await db.query('SELECT "locationId" FROM "RegisterEntry" WHERE id=$1', [scoped.body.id])).rows[0];
  if (scope?.locationId !== oxford) throw new Error("Restricted create did not retain its sole authorised location.");
  results.push({ name: "persisted location equals authorised Oxford", okay: true, status: 201 });

  const captured = await db.query('SELECT id FROM "RegisterEntry" WHERE title=$1 ORDER BY "createdAt" DESC LIMIT 1', ["WP003A fictional incident capture"]);
  const unassessedId = captured.rows[0]?.id;
  if (!unassessedId) throw new Error("Rendered Incident baseline record was not found.");
  expect("unassessed Incident assurance", await request(owner, `/api/registers/incidents/${unassessedId}/assurance`, { decision: "ASSURED_CLOSED", rationale: "Fictional assurance attempt" }), 400, "Assess");
  expect("unassessed Incident investigation completion", await request(owner, `/api/registers/incidents/${unassessedId}/investigation`, { intent: "complete" }), 400, "Assess");
  expect("restricted organisation-wide investigation", await request(restricted, `/api/registers/incidents/${unassessedId}/investigation`, { intent: "draft" }), 400, "outside your authorised editing locations");
  expect("restricted organisation-wide Evidence link", await request(restricted, "/api/evidence/contextual", { sourceType: "INCIDENT", sourceId: unassessedId, evidenceId: fixture.evidenceId }), 400, "outside your authorised editing locations");
  expect("restricted organisation-wide core update", await request(restricted, `/api/registers/incidents/${unassessedId}`, core, "PATCH"), 400, "outside your authorised editing locations");
  expect("restricted organisation-wide archive", await request(restricted, `/api/registers/incidents/${unassessedId}`, { intent: "archive" }, "PATCH"), 400, "outside your authorised editing locations");

  const complaintId = (await db.query('SELECT id FROM "RegisterEntry" WHERE title=$1 ORDER BY "createdAt" DESC LIMIT 1', ["WP003A fictional complaint capture"])).rows[0]?.id;
  const safeguardingId = (await db.query('SELECT id FROM "RegisterEntry" WHERE title=$1 ORDER BY "createdAt" DESC LIMIT 1', ["WP003A fictional safeguarding capture"])).rows[0]?.id;
  const ownerId = (await db.query('SELECT id FROM "User" WHERE email=$1', [E2E_USERS.riskOwner.email])).rows[0]?.id;
  if (!complaintId || !safeguardingId || !ownerId) throw new Error("Rendered Complaint or Safeguarding baseline fixture was not found.");
  expect("unassessed Complaint assurance", await request(owner, `/api/registers/complaints/${complaintId}/assurance`, { decision: "ASSURED_CLOSED", rationale: "Fictional assurance attempt", newInformation: "" }), 400, "Assess");
  expect("unassessed Complaint investigation completion", await request(owner, `/api/registers/complaints/${complaintId}/investigation`, { intent: "complete" }), 400, "Assess");
  expect("unassessed Complaint final response", await request(owner, `/api/registers/complaints/${complaintId}/communications`, { type: "FINAL_RESPONSE", direction: "OUTBOUND", participants: "Fictional person", summary: "Fictional final response" }), 400, "Assess");
  expect("unassessed safeguarding assurance", await request(owner, `/api/registers/safeguarding/${safeguardingId}/assurance`, { decision: "ASSURED_CLOSED", rationale: "Fictional assurance attempt", newInformation: "" }), 400, "Assess");
  expect("unassessed safeguarding ready milestone", await request(owner, `/api/registers/safeguarding/${safeguardingId}/case`, { status: "READY_FOR_ASSURANCE", safetyPosition: "SAFE_NOW", referralDecision: "NOT_REQUIRED", investigatorId: ownerId }), 400, "Assess");

  const closed = await db.query('UPDATE "RegisterEntry" SET status=$1 WHERE id=$2 RETURNING id', ["CLOSED", unassessedId]);
  if (!closed.rows.length) throw new Error("Could not prepare disposable closed-record test state.");
  try {
    expect("actual closed Incident update", await request(owner, `/api/registers/incidents/${unassessedId}`, core, "PATCH"), 400, "Reopen or restore");
    expect("actual closed Incident archive", await request(owner, `/api/registers/incidents/${unassessedId}`, { intent: "archive" }, "PATCH"), 400, "cannot be archived");
  } finally {
    await db.query('UPDATE "RegisterEntry" SET status=$1 WHERE id=$2', ["OPEN", unassessedId]);
  }

  console.log(`WP003A_DIRECT_REQUEST_GATE ${results.length}/${results.length} PASS`);
  for (const result of results) console.log(`${result.name}: PASS (HTTP ${result.status})`);
} finally {
  await db.end();
}
