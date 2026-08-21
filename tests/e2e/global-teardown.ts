import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default async function globalTeardown() {
  // Signal the owning wrapper instead of issuing an HTTP request to a Next
  // worker that may already be shutting down. The wrapper terminates the whole
  // Windows process tree, including compiler workers, and removes the sentinel.
  const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
  await writeFile(join(tmpdir(), `qcgms-playwright-${port}.stop`), "test run complete", "utf8").catch(() => undefined);
}
