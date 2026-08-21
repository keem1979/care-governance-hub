import { E2E_SETUP_TOKEN } from "./fixtures";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default async function globalSetup() {
  const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
  const response = await fetch(`http://127.0.0.1:${port}/api/test/e2e/setup`, {
    method: "POST",
    headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN },
  });
  if (!response.ok) {
    await writeFile(join(tmpdir(), `qcgms-playwright-${port}.stop`), "global setup failed", "utf8").catch(() => undefined);
    throw new Error(`Authenticated E2E setup failed (${response.status}).\n${await response.text()}`);
  }
}
