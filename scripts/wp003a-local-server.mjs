import "dotenv/config";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../tests/e2e/fixtures.ts", import.meta.url), "utf8");
const usersLiteral = source.match(/export const E2E_USERS = (\{[\s\S]*?\}) as const;/)?.[1];
if (!usersLiteral) throw new Error("E2E user fixture not found.");
const users = runInNewContext(`(${usersLiteral})`);
const owner = users.riskOwner;
const constant = (name) => source.match(new RegExp(`export const ${name} = "([^"]+)";`))?.[1];
process.env.SESSION_SECRET ||= constant("E2E_SESSION_SECRET");
process.env.E2E_MFA_SECRET = owner.mfaSecret;
process.env.E2E_SETUP_TOKEN = constant("E2E_SETUP_TOKEN");
process.env.E2E_USER_EMAIL = owner.email;
process.env.E2E_USER_NAME = owner.name;
process.env.E2E_USER_PASSWORD = owner.password;
process.env.E2E_USERS_JSON = JSON.stringify(users);
await import("./playwright-web-server.mjs");
