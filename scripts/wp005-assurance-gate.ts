import "dotenv/config";
import { spawn, spawnSync } from "node:child_process";
import pg from "pg";
// @ts-expect-error Node's type stripping requires explicit extensions for this local gate.
import { E2E_MFA_SECRET, E2E_SESSION_SECRET, E2E_SETUP_TOKEN, E2E_USER, E2E_USERS } from "../tests/e2e/fixtures.ts";
// @ts-expect-error Node's type stripping requires explicit extensions for this local gate.
import { generateTotp } from "../src/lib/auth/mfa.ts";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") throw new Error("WP-005 gate requires the named disposable local database.");
const port = 3117, base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  env: { ...process.env, NODE_ENV: "production", E2E_LOCAL_RELEASE_GATE: "1", E2E_SETUP_TOKEN, E2E_MFA_SECRET, SESSION_SECRET: E2E_SESSION_SECRET, E2E_USER_EMAIL: E2E_USER.email, E2E_USER_NAME: E2E_USER.name, E2E_USER_PASSWORD: E2E_USER.password, E2E_USERS_JSON: JSON.stringify(E2E_USERS) },
  stdio: "ignore", windowsHide: true,
});
child.unref();
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
let checks = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
  checks++;
  console.log(`PASS ${name}`);
}
async function login(user: typeof E2E_USERS[keyof typeof E2E_USERS]) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: user.password, mfaCode: generateTotp(user.mfaSecret) }) });
  check(`${user.roleKey} fictional login`, response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Fictional login cookie missing.");
  return cookie;
}
async function post(cookie: string, id: string, values: Record<string, string>) {
  return fetch(`${base}/api/actions/${id}/assurance/closure`, { method: "POST", headers: { Cookie: cookie }, body: new URLSearchParams(values) });
}

try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/login`)).ok) { ready = true; break; } } catch { /* Starting locally. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Isolated Next server did not start.");
  await db.connect();
  const reset = await fetch(`${base}/api/test/e2e/setup`, { method: "POST", headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  check("guarded fictional fixture setup", reset.status, 200);
  const fixture = await (await fetch(`${base}/api/test/e2e/setup`, { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).json() as { actions: Record<string, { id: string }>; evidenceId: string };
  const id = fixture.actions["E2E-ACT-ASSURANCE-LOW"].id;
  const highId = fixture.actions["E2E-ACT-ASSURANCE-HIGH"].id;
  const owner = await login(E2E_USERS.riskOwner);
  const admin = await login(E2E_USERS.actionAdministrator);
  const other = await login(E2E_USERS.otherTenant);
  const close = await post(owner, id, { intent: "close", rationale: "The fictional administrative change is complete with linked supporting Evidence.", evidenceIds: fixture.evidenceId });
  check("authorised human closure", close.status, 200);
  // Put the isolated High fixture into a closed state solely to exercise the
  // reopening authority branch; the Low Action above covers canonical closure.
  await db.query('UPDATE "Action" SET "closedAt"=now() WHERE id=$1', [highId]);
  const noRole = await post(admin, highId, { intent: "reopen", rationale: "An administrator attempts to bypass provider closure authority." });
  check("technical access cannot reopen", noRole.status, 400);
  check("provider-policy denial message", /not authorised.*closure policy/i.test((await noRole.json()).error), true);
  check("cross-tenant reopen concealed", (await post(other, highId, { intent: "reopen", rationale: "Cross-tenant attempted reopening." })).status, 404);
  check("missing reopening rationale rejected", (await post(owner, id, { intent: "reopen" })).status, 400);
  const stillClosed = await db.query<{ closedAt: Date | null }>('SELECT "closedAt" FROM "Action" WHERE id=$1', [id]);
  check("denied requests retain closure", Boolean(stillClosed.rows[0].closedAt), true);
  check("authorised reasoned reopening", (await post(owner, id, { intent: "reopen", rationale: "A new concern requires renewed governance review and further work." })).status, 200);
  const reopened = await db.query<{ closedAt: Date | null; completionDate: Date | null; progressPercent: number }>('SELECT "closedAt", "completionDate", "progressPercent" FROM "Action" WHERE id=$1', [id]);
  check("reopening clears current closure only", reopened.rows[0].closedAt, null);
  check("reopening requires renewed completion", reopened.rows[0].completionDate, null);
  check("reopening resets current progress", reopened.rows[0].progressPercent, 0);
  check("prior Evidence cannot immediately reclose", (await post(owner, id, { intent: "close", rationale: "Attempt to reuse the previous assurance decision and Evidence.", evidenceIds: fixture.evidenceId })).status, 409);
  const history = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM "ActivityLog" WHERE "recordType"=$1 AND "recordId"=$2', ["ActionClosure", id]);
  check("append-only closure and reopening events", history.rows[0].count >= 2, true);
  const renewal = await fetch(`${base}/api/actions/${id}/updates`, { method: "POST", headers: { Cookie: owner }, body: new URLSearchParams({ intent: "complete", status: "IN_PROGRESS", note: "Renewed fictional work was completed after the management concern.", evidenceId: fixture.evidenceId }) });
  check("renewed work accepted", renewal.status, 200);
  check("authorised low-risk closure after renewed work", (await post(owner, id, { intent: "close", rationale: "The renewed work and linked Evidence were reviewed for a fresh closure decision.", evidenceIds: fixture.evidenceId })).status, 200);
  console.log(`WP005_ASSURANCE_GATE PASS ${checks}/${checks}`);
} finally {
  await db.end().catch(() => undefined);
  if (child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
}
