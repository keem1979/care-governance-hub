import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { e2eGoto, signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

test("Safeguarding worklist, progress and assurance remain practical on mobile", async ({ page, request }) => {
  test.setTimeout(300_000);
  expect((await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).status()).toBe(200);
  const setup = await (await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).json() as { safeguarding: Record<string, { id: string }> };
  await signIn(page, E2E_USERS.registeredManager);

  await e2eGoto(page, "/registers/safeguarding");
  await expect(page.getByRole("region", { name: "Governance worklist" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await e2eGoto(page, `/registers/safeguarding/${setup.safeguarding["E2E-SG-READY"].id}`);
  await expect(page.getByRole("heading", { name: "Concern → safety → referral → enquiry → assurance" })).toBeVisible();
  await expect(page.locator("#current-work")).toBeVisible();
  await expect(page.locator("#safeguarding-case")).not.toHaveAttribute("open", "");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const button = page.getByRole("button", { name: "Authorise closure" });
  await expect(button).toBeVisible();
  expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(36);
  const directory = process.env.QCGMS_VISUAL_CAPTURE_DIR;
  if (directory) {
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, "mobile-safeguarding-detail.png"), fullPage: true });
  }
  await page.locator("#safeguarding-case summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Confirm only what is known now" })).toBeVisible();
});
