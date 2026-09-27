import { expect, test } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_USERS } from "./fixtures";

test("policy review work leads the library without implying approval", async ({ page }, testInfo) => {
  await signIn(page, E2E_USERS.registeredManager);
  await page.goto("/policies", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Policy Library" })).toBeVisible();
  const currentWork = page.getByRole("region", { name: "Policy current work" });
  await expect(currentWork).toBeVisible();
  await expect(currentWork).not.toContainText(/assured|compliant|automatically approved/i);
  await expect(page.getByRole("searchbox", { name: "Search policies" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`wp009-policy-library-${testInfo.project.name}.png`), fullPage: true });
});

test("a fictional policy needs an explicit approval and a new review before editing", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await signIn(page, E2E_USERS.registeredManager);
  await page.goto("/policies/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /new policy|add.*policy|upload.*policy/i }).first()).toBeVisible();
  const title = `WP009 fictional policy ${Date.now()}`;
  await page.getByLabel("Policy title").fill(title);
  await page.getByLabel("Category").selectOption("Governance");
  await page.getByLabel("Owner").selectOption({ label: E2E_USERS.riskOwner.name });
  await page.getByLabel(/Policy document/).setInputFiles({ name: "fictional-policy.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nfictional test document\n%%EOF") });
  const created = page.waitForResponse((response) => response.url().endsWith("/api/policies") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create policy" }).click();
  expect((await created).status()).toBe(201);
  await expect(page).toHaveURL(/\/policies\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const currentWork = page.getByRole("region", { name: "Policy current work" });
  await expect(currentWork).toContainText("Review the document");
  await expect(currentWork.getByRole("button", { name: "Record approval" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit details" })).toBeVisible();
  const remove = currentWork.getByRole("button", { name: "Remove policy" });
  await remove.scrollIntoViewIfNeeded();
  expect(await remove.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === button || button.contains(hit);
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`wp009-policy-draft-${testInfo.project.name}.png`), fullPage: true });

  const approved = page.waitForResponse((response) => response.url().includes("/api/policies/") && response.request().method() === "PATCH");
  await currentWork.getByRole("button", { name: "Record approval" }).click();
  expect((await approved).status()).toBe(200);
  await expect(currentWork.getByRole("button", { name: "Start review" })).toBeVisible();
  await expect(currentWork).toContainText("Current position");
  await expect(page.getByRole("link", { name: "Edit details" })).toHaveCount(0);
  await expect(currentWork).toContainText(E2E_USERS.registeredManager.name);
  await page.screenshot({ path: testInfo.outputPath(`wp009-policy-approved-${testInfo.project.name}.png`), fullPage: true });

  page.once("dialog", (dialog) => dialog.accept());
  const review = page.waitForResponse((response) => response.url().includes("/api/policies/") && response.request().method() === "PATCH");
  await currentWork.getByRole("button", { name: "Start review" }).click();
  expect((await review).status()).toBe(200);
  await expect(currentWork.getByRole("button", { name: "Record approval" })).toBeVisible();
  await expect(currentWork).toContainText("Approval not recorded");
  await expect(page.getByRole("link", { name: "Edit details" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test("Provider Control current work precedes draft setup and preserves separate activation", async ({ page }, testInfo) => {
  await signIn(page, E2E_USERS.organisationOwner);
  await page.goto("/settings/provider-controls", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Provider Control Library" })).toBeVisible();
  const currentWork = page.getByRole("region", { name: "Provider Control current work" });
  await expect(currentWork).toBeVisible();
  await expect(currentWork).toContainText("Activation and effectiveness remain separate human decisions");
  const retired = page.locator("details").filter({ has: page.locator("summary", { hasText: /Retired Control history/ }) });
  if (await retired.count()) expect(await retired.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
  await expect(page.getByText("Create a Provider Control draft")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`wp009-provider-controls-${testInfo.project.name}.png`), fullPage: true });
});
