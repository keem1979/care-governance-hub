import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

test("measure actual Audit work and Evidence controls without a time-saving inference", async ({ page, request }, testInfo) => {
  test.setTimeout(300_000);
  const setup = await (await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).json() as { audit: { template: { id: string } } };
  await signIn(page, E2E_USERS.registeredManager);
  await page.goto(`/audits/new?template=${setup.audit.template.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByText("Optional setup").click();
  await page.getByLabel("Custom audit title").fill(`E2E-AUDIT-WP007-MEASURE-${Date.now()}`);
  await page.getByRole("button", { name: "Start audit now" }).click();
  await expect(page).toHaveURL(/\/audits\/[0-9a-f-]+#audit-form/);
  await page.waitForLoadState("networkidle");
  const auditId = page.url().match(/\/audits\/([0-9a-f-]+)/)![1];
  await expect(page.locator("#audit-form fieldset").first()).toBeVisible();
  const form = { questionCount: await page.locator("#audit-form fieldset").count(), visibleSourceTypesBeforeAnswer: await page.getByLabel("Source type").count(), visibleEvidencePickersBeforeAnswer: await page.getByLabel("Controlled Evidence Library record").count() };
  await page.screenshot({ path: testInfo.outputPath(`wp007-measure-form-${testInfo.project.name}.png`), fullPage: true });
  await page.getByLabel("Finding or response").first().selectOption("COMPLIANT");
  const sourceTypesAfterFirstAnswer = await page.getByLabel("Source type").count();
  await page.goto("/audits", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  const firstWork = page.locator(`a[href="/audits/${auditId}#audit-form"]`).first();
  await expect(firstWork).toBeVisible();
  const position = await page.evaluate((id) => {
    const title = document.querySelector("h1");
    const link = document.querySelector(`a[href="/audits/${id}#audit-form"]`);
    if (!title || !link) return null;
    return { titleY: title.getBoundingClientRect().top + scrollY, firstWorkY: link.getBoundingClientRect().top + scrollY, firstWorkOffset: Math.round(link.getBoundingClientRect().top - title.getBoundingClientRect().top) };
  }, auditId);
  expect(position).not.toBeNull();
  await page.screenshot({ path: testInfo.outputPath(`wp007-measure-list-${testInfo.project.name}.png`), fullPage: true });
  await writeFile(testInfo.outputPath(`wp007-audit-burden-${testInfo.project.name}.json`), JSON.stringify({ project: testInfo.project.name, viewport: page.viewportSize(), list: position, form: { ...form, visibleSourceTypesAfterFirstAnswer: sourceTypesAfterFirstAnswer } }, null, 2));
});
