import "dotenv/config";
import { spawn, spawnSync } from "node:child_process";
import pg from "pg";
// @ts-expect-error Node's built-in type stripping requires explicit extensions.
import { E2E_MFA_SECRET, E2E_SESSION_SECRET, E2E_SETUP_TOKEN, E2E_USER, E2E_USERS } from "../tests/e2e/fixtures.ts";
// @ts-expect-error Node's built-in type stripping requires explicit extensions.
import { generateTotp } from "../src/lib/auth/mfa.ts";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") throw new Error("WP-004 direct requests require the named disposable local database.");
const port = 3107, base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  env: { ...process.env, NODE_ENV: "production", E2E_LOCAL_RELEASE_GATE: "1", E2E_SETUP_TOKEN, E2E_MFA_SECRET, SESSION_SECRET: E2E_SESSION_SECRET, E2E_USER_EMAIL: E2E_USER.email, E2E_USER_NAME: E2E_USER.name, E2E_USER_PASSWORD: E2E_USER.password, E2E_USERS_JSON: JSON.stringify(E2E_USERS) },
  stdio: "ignore", windowsHide: true,
});
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const results: string[] = [];
function check(name: string, condition: boolean) { if (!condition) throw new Error(`${name} failed`); results.push(name); }
async function login(user: typeof E2E_USERS[keyof typeof E2E_USERS]) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: user.password, mfaCode: generateTotp(user.mfaSecret) }) });
  check(`${user.roleKey} fictional login`, response.status === 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Fictional login cookie missing");
  return cookie;
}
async function post(cookie: string, path: string, data: Record<string, string>) { return fetch(`${base}${path}`, { method: "POST", headers: { Cookie: cookie }, body: new URLSearchParams(data) }); }
async function patch(cookie: string, path: string, data: Record<string, string>) { return fetch(`${base}${path}`, { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(data) }); }

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(`${base}/login`)).ok) { ready = true; break; } } catch { /* server is still starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Isolated Next server did not start");
  await db.connect();
  const setup = await fetch(`${base}/api/test/e2e/setup`, { method: "POST", headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  check("guarded fictional fixture setup", setup.status === 200);
  const fixture = await (await fetch(`${base}/api/test/e2e/setup`, { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).json() as { actions: Record<string, { id: string; locationId: string }>; evidenceId: string; correctedEvidenceId: string };
  const high = fixture.actions["E2E-ACT-ASSURANCE-HIGH"];
  const owner = await login(E2E_USERS.riskOwner), manager = await login(E2E_USERS.registeredManager), restricted = await login(E2E_USERS.locationRestricted), other = await login(E2E_USERS.otherTenant);
  check("foreign-location completion rejected", (await post(restricted, `/api/actions/${high.id}/updates`, { intent: "complete", note: "Fictional work completed", evidenceId: fixture.evidenceId })).status === 404);
  check("foreign-location archive rejected", (await patch(restricted, `/api/actions/${high.id}`, { intent: "archive" })).status === 404);
  check("other tenant completion hidden", (await post(other, `/api/actions/${high.id}/updates`, { intent: "complete", note: "Fictional work completed", evidenceId: fixture.evidenceId })).status === 404);
  check("owner self-verification rejected", (await post(owner, `/api/actions/${high.id}/assurance/verification`, { outcome: "VERIFIED", verifiedAt: new Date().toISOString().slice(0, 10), verifierId: "forged", evidenceIds: fixture.evidenceId, completedWork: "Fictional work completed", evidenceSummary: "Fictional Evidence reviewed", successMeasureResult: "The fictional result was checked", rationale: "The fictional work has been evidenced" })).status === 400);
  check("missing recurrence decision rejected", (await post(manager, `/api/actions/${high.id}/assurance/effectiveness`, { outcome: "EFFECTIVE", reviewDate: new Date().toISOString().slice(0, 10), observedResult: "Fictional later result", decision: "Fictional management decision", evidenceIds: fixture.evidenceId })).status === 400);

  const ownerId = (await db.query('SELECT id FROM "User" WHERE email=$1', [E2E_USERS.riskOwner.email])).rows[0]?.id;
  const managerId = (await db.query('SELECT id FROM "User" WHERE email=$1', [E2E_USERS.registeredManager.email])).rows[0]?.id;
  if (!ownerId || !managerId) throw new Error("Fictional users missing");
  const due = new Date(); due.setUTCDate(due.getUTCDate() + 30);
  const runKey = Date.now();
  const creationInput = { title: `WP004 fictional direct request assurance ${runKey}`, description: "A fictional Action for direct request security checks.", expectedOutcome: "The fictional check is implemented.", successMeasure: "A fictional later review observes the check.", ownerId, oversightOwnerId: managerId, dueDate: due.toISOString().slice(0, 10), category: "Governance", priority: "HIGH", source: "MANUAL:", issueKey: `wp004-direct-${runKey}` };
  const forgedCreation = await post(manager, "/api/actions", { ...creationInput, progressPercent: "100" });
  check("creation cannot assert completed work", forgedCreation.status === 400 && (await forgedCreation.json() as { error?: string }).error?.includes("Completion Evidence") === true);
  const created = await post(manager, "/api/actions", creationInput);
  const createdBody = await created.json() as { id?: string; error?: string };
  if (created.status !== 201) throw new Error(`Fictional Action creation failed (${created.status}): ${createdBody.error ?? "unknown error"}`);
  check("fictional organisation-wide Action created", Boolean(createdBody.id));
  const id = createdBody.id!;
  check("restricted organisation-wide write rejected", (await post(restricted, `/api/actions/${id}/updates`, { intent: "progress", note: "Forged update" })).status === 400);
  check("restricted organisation-wide archive rejected", (await patch(restricted, `/api/actions/${id}`, { intent: "archive" })).status === 400);
  check("different-branch completion Evidence rejected", (await post(owner, `/api/actions/${id}/updates`, { intent: "complete", note: "Fictional work has been completed.", evidenceId: fixture.correctedEvidenceId })).status === 400);
  check("different-branch role link rejected", (await post(manager, `/api/actions/${id}/evidence-links`, { role: "COMPLETION", evidenceIds: fixture.correctedEvidenceId })).status === 400);
  await db.query('UPDATE "Evidence" SET status=\'ARCHIVED\', "archivedAt"=CURRENT_TIMESTAMP WHERE id=$1', [fixture.evidenceId]);
  try {
    check("archived completion Evidence rejected", (await post(owner, `/api/actions/${id}/updates`, { intent: "complete", note: "Fictional work has been completed.", evidenceId: fixture.evidenceId })).status === 400);
    check("archived role link rejected", (await post(manager, `/api/actions/${id}/evidence-links`, { role: "COMPLETION", evidenceIds: fixture.evidenceId })).status === 400);
  } finally {
    await db.query('UPDATE "Evidence" SET status=\'ACTIVE\', "archivedAt"=NULL WHERE id=$1', [fixture.evidenceId]);
  }
  check("missing completion account rejected", (await post(owner, `/api/actions/${id}/updates`, { intent: "complete", note: "", evidenceId: fixture.evidenceId })).status === 400);
  check("missing completion Evidence rejected", (await post(owner, `/api/actions/${id}/updates`, { intent: "complete", note: "Fictional work has been completed." })).status === 400);
  check("general edit cannot assert 100% completion", (await fetch(`${base}/api/actions/${id}`, { method: "PATCH", headers: { Cookie: manager }, body: new URLSearchParams({ progressPercent: "100" }) })).status === 400);
  const validCompletion = await post(owner, `/api/actions/${id}/updates`, { intent: "complete", note: "The fictional medicines control was implemented.", evidenceId: fixture.evidenceId });
  if (validCompletion.status !== 200) { const body = await validCompletion.json() as { error?: string }; throw new Error(`valid completion accepted failed (${validCompletion.status}): ${body.error ?? "unspecified"}`); }
  check("valid completion accepted", true);
  const state = (await db.query('SELECT a."progressPercent",a."lifecycleStatus",a."completionDate",a."verifiedById",a."closedAt",(SELECT count(*)::int FROM "ActionEvidence" WHERE "actionId"=a.id AND role=\'COMPLETION\' AND "retiredAt" IS NULL) AS evidence FROM "Action" a WHERE a.id=$1', [id])).rows[0];
  check("canonical completion Evidence and open assurance", state?.progressPercent === 100 && state.lifecycleStatus === "AWAITING_VERIFICATION" && state.completionDate && !state.verifiedById && !state.closedAt && state.evidence === 1);
  check("premature closure rejected", (await post(manager, `/api/actions/${id}/assurance/closure`, { intent: "close", rationale: "A fictional premature closure attempt", evidenceIds: fixture.evidenceId })).status === 409);
  const low = fixture.actions["E2E-ACT-ASSURANCE-LOW"];
  check("proportionate fictional low-priority closure accepted", (await post(owner, `/api/actions/${low.id}/assurance/closure`, { intent: "close", rationale: "The fictional low-priority work and supporting Evidence have been reviewed.", evidenceIds: fixture.evidenceId })).status === 200);
  check("closed Action archive rejected", (await patch(owner, `/api/actions/${low.id}`, { intent: "archive" })).status === 400);
  check("closed Action restore rejected", (await patch(owner, `/api/actions/${low.id}`, { intent: "restore" })).status === 400);
  console.log(`WP004_DIRECT_REQUEST_GATE ${results.length}/${results.length} PASS`);
  for (const name of results) console.log(`${name}: PASS`);
} finally {
  await db.end().catch(() => undefined);
  if (child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  child.kill();
  child.unref();
}
