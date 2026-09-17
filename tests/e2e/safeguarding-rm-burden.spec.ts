import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { e2eGoto, signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

test("RM safeguarding experience is exception-led and progressively disclosed", async ({ page, request }) => {
  test.setTimeout(300_000);
  expect((await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).status()).toBe(200);
  const setup = await (await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).json() as { safeguarding: Record<string, { id: string }> };
  await signIn(page, E2E_USERS.registeredManager);

  await e2eGoto(page, "/dashboard");
  await expect(page.getByRole("heading", { name: "What requires management attention today?" })).toBeVisible();
  await expect(page.getByText("Overall completion")).toHaveCount(0);
  await capture(page, "desktop-command-centre.png");

  await e2eGoto(page, "/registers/safeguarding");
  await expect(page.getByRole("navigation", { name: "Quick views" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Governance worklist" })).toBeVisible();
  await expect(page.locator("table")).toHaveCount(0);
  await capture(page, "desktop-safeguarding-worklist.png");

  await e2eGoto(page, "/registers/safeguarding/new");
  await expect(page.getByText("Required now", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Known record context" })).toBeVisible();
  await expect(page.getByLabel("Reference", { exact: true })).toHaveCount(0);
  const required = await page.locator("input[required], textarea[required], select[required]").count();
  expect(required).toBeLessThanOrEqual(5);
  expect(await page.getByLabel("Person/client this record relates to *").count()).toBe(1);
  await capture(page, "desktop-safeguarding-capture.png");

  await e2eGoto(page, `/registers/safeguarding/${setup.safeguarding["E2E-SG-READY"].id}`);
  await expect(page.getByRole("region", { name: "Record attention summary" })).toBeVisible();
  await expect(page.getByText("Automatic chronology")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create linked Action" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Print assurance record" })).toBeVisible();
  await expect(page.getByRole("link", { name: /E2E-ACT-SAFEGUARDING-EFFECTIVE/ })).toBeVisible();
  await capture(page, "desktop-safeguarding-detail.png");
});

async function capture(page: import("@playwright/test").Page, filename: string) {
  const directory = process.env.QCGMS_VISUAL_CAPTURE_DIR;
  if (!directory) return;
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: join(directory, filename), fullPage: true });
}
