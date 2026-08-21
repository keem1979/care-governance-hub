import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { E2E_MFA_SECRET, E2E_SESSION_SECRET, E2E_SETUP_TOKEN, E2E_USER } from "./tests/e2e/fixtures";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  webServer: {
    command: `npm run dev -- -p ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:5432/care_governance_hub",
      SESSION_SECRET:
        process.env.SESSION_SECRET ??
        E2E_SESSION_SECRET,
      E2E_MFA_SECRET,
      E2E_SETUP_TOKEN,
      E2E_USER_EMAIL: E2E_USER.email,
      E2E_USER_NAME: E2E_USER.name,
      E2E_USER_PASSWORD: E2E_USER.password,
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
});
