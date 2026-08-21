import { E2E_SETUP_TOKEN } from "./fixtures";

export default async function globalSetup() {
  const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
  const response = await fetch(`http://127.0.0.1:${port}/api/test/e2e/setup`, {
    method: "POST",
    headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN },
  });
  if (!response.ok) {
    throw new Error(`Authenticated E2E setup failed (${response.status}).\n${await response.text()}`);
  }
}
