import { expect, test } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_USERS } from "./fixtures";

test("RM sees sourced inspection and commissioner work before calculated summaries", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await signIn(page, E2E_USERS.registeredManager);
  await page.goto("/inspection", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Inspection Centre" })).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay")).toHaveCount(0);
  const currentWork = page.getByRole("region", { name: "What needs attention" });
  await expect(currentWork).toBeVisible();
  const sourceWork = page.getByRole("region", { name: "Serious risks, commissioner and return work" });
  await expect(sourceWork).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Inspection views" })).toBeVisible();
  await expect(page.getByLabel("Key question")).toBeVisible();
  await expect(page.getByLabel("Assurance status")).toBeVisible();
  await expect(currentWork.getByRole("link", { name: /Open / }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Chat with Abi/ })).toHaveCount(0);
  const allAttention = currentWork.getByText(/Show all \d+ requirements needing attention/);
  if (await allAttention.count()) {
    await allAttention.click();
    expect(await currentWork.locator("article").count()).toBeGreaterThan(8);
    await expect(currentWork.locator("article").nth(8)).toBeVisible();
    await allAttention.click();
  }
  const allSources = sourceWork.getByText(/Show all \d+ source records/);
  if (await allSources.count()) {
    await allSources.click();
    await expect(sourceWork.locator("article").nth(8)).toBeVisible();
    await allSources.click();
  }
  expect(await page.locator("main").last().ariaSnapshot()).toContain("What needs attention");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("wp010-inspection-first-viewport.png") });
  await page.screenshot({ path: testInfo.outputPath("wp010-inspection-current-work.png"), fullPage: true });

  await page.getByRole("link", { name: "RM assurance pack" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Registered Manager Inspection Assurance Pack" })).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "What needs attention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Serious risks, commissioner and return work" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sourced requirement record" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Chat with Abi/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("wp010-pack-first-viewport.png") });
  await page.screenshot({ path: testInfo.outputPath("wp010-inspection-pack.png"), fullPage: true });
  expect(browserErrors).toEqual([]);
});

test("location-restricted RM sees limited assurance scope in the compiled pack", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, E2E_USERS.locationRestricted);
  await page.goto("/inspection/pack", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Registered Manager Inspection Assurance Pack" })).toBeVisible();
  await expect(page.getByText(/Full organisation-wide assurance cannot be established from this location-scoped view/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "What needs attention" })).toBeVisible();
  await expect(page.getByText("All authorised locations")).toHaveCount(0);
});
