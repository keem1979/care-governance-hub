import { E2E_SETUP_TOKEN } from "./fixtures";

export default async function globalTeardown() {
  const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
  const response = await fetch(`http://127.0.0.1:${port}/api/test/e2e/setup`, {
    method: "DELETE",
    headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN },
  });
  if (!response.ok) {
    throw new Error(`Authenticated E2E cleanup failed (${response.status}).\n${await response.text()}`);
  }
}
