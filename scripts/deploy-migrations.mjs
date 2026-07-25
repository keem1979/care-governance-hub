import "dotenv/config";
import { spawnSync } from "node:child_process";

const configured = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!configured) throw new Error("DATABASE_URL is not configured.");

const url = new URL(configured);
url.hostname = url.hostname.replace("-pooler.", ".");
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url.toString() },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
