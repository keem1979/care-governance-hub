import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const FINAL_MIGRATION = "20260821194500_audit_assurance_closed_loop";
const TEMP_BASENAME = "qcgms-action-assurance-release-gate";
const root = resolve(tmpdir(), TEMP_BASENAME);
const dataDir = join(root, "pgdata");
const previousMigrations = join(root, "migrations-before-action-assurance");
const port = Number(process.env.QCGMS_E2E_PG_PORT ?? 55439);
const webPort = Number(process.env.QCGMS_E2E_WEB_PORT ?? 3021);
const freshDatabase = "qcgms_e2e_action_fresh";
const upgradeDatabase = "qcgms_e2e_action_upgrade";
const seedDatabase = "qcgms_e2e_action_seed";
const pgBin = locatePostgresBin();
const releaseBuildDir = `.next-release-gate-${process.pid}`;
let clusterStarted = false;

await main();

async function main() {
  assertGuardrails();
  guardedRemove(root);
  mkdirSync(root, { recursive: true });
  try {
    step("Initialise disposable PostgreSQL cluster");
    run(pg("initdb"), ["-D", dataDir, "-A", "trust", "-U", "postgres", "--encoding=UTF8", "--no-locale"]);
    run(pg("pg_ctl"), ["-D", dataDir, "-o", `-h 127.0.0.1 -p ${port} -F`, "-w", "start"]);
    clusterStarted = true;

    for (const database of [freshDatabase, upgradeDatabase, seedDatabase]) {
      run(pg("createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", database]);
    }

    step("Fresh-schema migration proof");
    const freshUrl = databaseUrl(freshDatabase);
    prismaDeploy(freshUrl);
    psql(freshDatabase, "scripts/release-gate/verify-action-assurance-fresh.sql");
    psql(freshDatabase, "scripts/release-gate/verify-audit-assurance.sql");

    step("Immediately preceding-schema upgrade proof");
    copyPreviousMigrations();
    const upgradeUrl = databaseUrl(upgradeDatabase);
    prismaDeploy(upgradeUrl, previousMigrations);
    psql(upgradeDatabase, "scripts/release-gate/evidence-controls-upgrade-fixture.sql");
    psql(upgradeDatabase, "scripts/release-gate/audit-assurance-upgrade-fixture.sql");
    prismaDeploy(upgradeUrl);
    psql(upgradeDatabase, "scripts/release-gate/verify-evidence-controls-upgrade.sql");
    psql(upgradeDatabase, "scripts/release-gate/verify-audit-assurance.sql");

    step("Deployment-seed proof on a disposable database");
    const seedUrl = databaseUrl(seedDatabase);
    prismaDeploy(seedUrl);
    run(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], { DATABASE_URL: seedUrl });

    step("Production-mode Next build for signed-in browser validation");
    run(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
      DATABASE_URL: freshUrl,
      SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-only-secret-with-at-least-thirty-two-characters",
      E2E_LOCAL_RELEASE_GATE: "1",
      NEXT_DIST_DIR: releaseBuildDir,
    });

    step("Signed-in desktop Action assurance gate");
    run(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "tests/e2e/action-assurance-release-gate.spec.ts", "tests/e2e/audit-assurance-release-gate.spec.ts", "--project=chromium"], {
      DATABASE_URL: freshUrl,
      PLAYWRIGHT_PORT: String(webPort),
      PLAYWRIGHT_SERVER_MODE: "production",
      E2E_LOCAL_RELEASE_GATE: "1",
      NEXT_DIST_DIR: releaseBuildDir,
      CI: "1",
    });
    await assertPortReleased(webPort);

    step("Evidence search performance probe (5,000 synthetic local rows)");
    psql(freshDatabase, "scripts/release-gate/evidence-controls-performance.sql");

    step("Signed-in mobile Action assurance gate");
    run(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "tests/e2e/action-assurance-mobile.spec.ts", "tests/e2e/audit-assurance-mobile.spec.ts", "--project=mobile"], {
      DATABASE_URL: freshUrl,
      PLAYWRIGHT_PORT: String(webPort),
      PLAYWRIGHT_SERVER_MODE: "production",
      E2E_LOCAL_RELEASE_GATE: "1",
      NEXT_DIST_DIR: releaseBuildDir,
      CI: "1",
    });
    await assertPortReleased(webPort);

    step("RELEASE GATE PASS");
  } finally {
    if (clusterStarted) {
      run(pg("pg_ctl"), ["-D", dataDir, "-m", "fast", "-w", "stop"], {}, true);
    }
    await assertPortReleased(port).catch(error => console.error(error.message));
    guardedRemove(root);
  }
}

function copyPreviousMigrations() {
  const source = resolve("prisma/migrations");
  mkdirSync(previousMigrations, { recursive: true });
  for (const name of readdirSync(source)) {
    if (name === FINAL_MIGRATION) continue;
    cpSync(join(source, name), join(previousMigrations, name), { recursive: true });
  }
  if (!existsSync(join(source, FINAL_MIGRATION, "migration.sql"))) {
    throw new Error(`Required final migration ${FINAL_MIGRATION} was not found.`);
  }
}

function prismaDeploy(url, migrationPath) {
  const extra = { DATABASE_URL: url };
  if (migrationPath) extra.QCGMS_E2E_MIGRATIONS_PATH = migrationPath;
  run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], extra);
}

function psql(database, file) {
  run(pg("psql"), ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-f", resolve(file)]);
}

function databaseUrl(database) {
  if (!database.startsWith("qcgms_e2e_")) throw new Error("Refusing a non-test database name.");
  const url = `postgresql://postgres@127.0.0.1:${port}/${database}?schema=public&sslmode=disable`;
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" || !parsed.pathname.slice(1).startsWith("qcgms_e2e_")) {
    throw new Error("Release gate may connect only to an explicit local test database.");
  }
  return url;
}

function assertGuardrails() {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid disposable PostgreSQL port.");
  if (!Number.isInteger(webPort) || webPort < 1024 || webPort > 65535 || webPort === port) throw new Error("Invalid isolated web port.");
  const expectedRoot = resolve(tmpdir(), TEMP_BASENAME);
  if (root !== expectedRoot || basename(root) !== TEMP_BASENAME) throw new Error("Unsafe release-gate temporary path.");
}

function guardedRemove(target) {
  const expectedRoot = resolve(tmpdir(), TEMP_BASENAME);
  if (resolve(target) !== expectedRoot || basename(target) !== TEMP_BASENAME) throw new Error("Refusing unsafe temporary-directory removal.");
  rmSync(target, { recursive: true, force: true });
}

function locatePostgresBin() {
  const candidates = [
    process.env.QCGMS_E2E_PG_BIN,
    process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin" : undefined,
    process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\16\\bin" : undefined,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(join(candidate, process.platform === "win32" ? "initdb.exe" : "initdb"))) return candidate;
  }
  const lookup = spawnSync(process.platform === "win32" ? "where.exe" : "which", [process.platform === "win32" ? "initdb.exe" : "initdb"], { encoding: "utf8", windowsHide: true });
  if (lookup.status === 0 && lookup.stdout.trim()) return resolve(lookup.stdout.trim().split(/\r?\n/)[0], "..");
  throw new Error("PostgreSQL 16+ command-line tools were not found. Set QCGMS_E2E_PG_BIN.");
}

function pg(name) {
  return join(pgBin, process.platform === "win32" ? `${name}.exe` : name);
}

function run(executable, args, extraEnv = {}, tolerateFailure = false) {
  const env = { ...process.env, ...extraEnv };
  if (!("QCGMS_E2E_MIGRATIONS_PATH" in extraEnv)) delete env.QCGMS_E2E_MIGRATIONS_PATH;
  const result = spawnSync(executable, args, { cwd: process.cwd(), env, stdio: "inherit", windowsHide: true });
  if (result.error && !tolerateFailure) throw result.error;
  if (result.status !== 0 && !tolerateFailure) throw new Error(`${executable} exited with status ${result.status}.`);
  return result.status;
}

async function assertPortReleased(targetPort) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await canBind(targetPort)) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Port ${targetPort} remained occupied after teardown.`);
}

function canBind(targetPort) {
  return new Promise(resolvePromise => {
    const server = createServer();
    server.once("error", () => resolvePromise(false));
    server.listen({ host: "127.0.0.1", port: targetPort, exclusive: true }, () => server.close(() => resolvePromise(true)));
  });
}

function step(message) {
  console.log(`\n=== ${message} ===`);
}
