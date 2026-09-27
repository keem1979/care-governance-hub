import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type Setup = { evidenceId: string; oxfordAuditEvidenceId: string; audit: { template: { id: string }; locationId: string } };

test("unfinished Audit work is visible before score and form history", async ({ page, request }, testInfo) => {
  const setup = await fixture(request);
  await signIn(page, E2E_USERS.registeredManager);
  const auditId = await startAudit(page, setup);
  await page.getByRole("button", { name: "Submit completed form for review" }).click();
  const firstCheck = page.locator("#audit-form fieldset").first();
  await expect(firstCheck.getByLabel("Finding or response")).toBeFocused();
  await expect(firstCheck.getByText("Choose a response for this check.")).toBeVisible();
  await page.goto("/audits", { waitUntil: "domcontentloaded" });
  const current = page.getByRole("region", { name: "Current audit work" });
  await expect(current).toBeVisible();
  await expect(current.locator(`a[href="/audits/${auditId}#audit-form"]`)).toHaveText("Continue audit form");
  const order = await page.evaluate(() => {
    const current = document.querySelector('[aria-label="Current audit work"]');
    const scores = [...document.querySelectorAll("section")].find((element) => element.textContent?.includes("Completed or closed"));
    return current && scores ? (current.compareDocumentPosition(scores) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 : false;
  });
  expect(order).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`wp007-audit-current-work-viewport-${testInfo.project.name}.png`) });
  await page.screenshot({ path: testInfo.outputPath(`wp007-audit-current-work-${testInfo.project.name}.png`), fullPage: true });
});

test("Audit Evidence accepts the audit service or organisation-wide source and rejects another service", async ({ page, request }, testInfo) => {
  const setup = await fixture(request);
  expect(setup.evidenceId).toBeTruthy();
  expect(setup.oxfordAuditEvidenceId).toBeTruthy();
  await signIn(page, E2E_USERS.registeredManager);
  const auditId = await startAudit(page, setup);
  const checks = page.locator("#audit-form fieldset");
  await expect(checks.first()).toBeVisible();
  const count = await checks.count();
  for (let index = 0; index < count; index++) {
    const check = checks.nth(index);
    await check.getByLabel("Finding or response").selectOption(index === 0 ? "NON_COMPLIANT" : "COMPLIANT");
    await check.getByLabel("What you checked and found").fill(index === 0 ? "The fictional sample identified a controlled gap." : "The fictional sample met the expected standard.");
    await check.getByLabel("Controlled Evidence Library record").selectOption(setup.evidenceId);
  }
  const submittedResponse = page.waitForResponse((item) => item.url().endsWith(`/api/audits/${auditId}/responses`) && item.request().method() === "POST");
  await page.getByRole("button", { name: "Submit completed form for review" }).click();
  const response = await submittedResponse;
  expect(response.status(), JSON.stringify(await response.json())).toBe(200);
  const payload = response.request().postDataJSON() as { intent: string; responses: Array<{ evidenceId: string; answer: string }> };
  await page.reload({ waitUntil: "domcontentloaded" });
  const findingLink = page.getByRole("link", { name: "Review and create corrective Action" }).first();
  await expect(findingLink).toBeVisible();
  const findingId = new URL((await findingLink.getAttribute("href"))!, "http://local").searchParams.get("sourceId")!;
  const forgedAnswer = await page.evaluate(async ({ auditId, payload }) => {
    const forged = structuredClone(payload); forged.intent = "save"; forged.responses[0].answer = "UNSUPPORTED_ASSURANCE";
    return (await fetch(`/api/audits/${auditId}/responses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(forged) })).status;
  }, { auditId, payload });
  expect(forgedAnswer).toBe(400);
  const organisationWideLink = await page.evaluate(async ({ auditId, findingId, evidenceId }) => {
    const form = new FormData(); form.set("evidenceId", evidenceId); form.set("role", "SUPPORTING");
    return (await fetch(`/api/audits/${auditId}/findings/${findingId}/evidence`, { method: "POST", body: form })).status;
  }, { auditId, findingId, evidenceId: setup.evidenceId });
  expect(organisationWideLink).toBe(200);
  const negative = await page.evaluate(async ({ auditId, payload, foreignId }) => {
    payload.intent = "save";
    payload.responses[0].evidenceId = foreignId;
    const response = await fetch(`/api/audits/${auditId}/responses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return { status: response.status, body: await response.json() };
  }, { auditId, payload, foreignId: setup.oxfordAuditEvidenceId });
  expect(negative.status).toBe(400);
  expect(negative.body.error).toMatch(/location|found/i);
  const linked = await page.evaluate(async ({ auditId, findingId, foreignId }) => {
    const form = new FormData(); form.set("evidenceId", foreignId); form.set("role", "FINDING");
    return (await fetch(`/api/audits/${auditId}/findings/${findingId}/evidence`, { method: "POST", body: form })).status;
  }, { auditId, findingId, foreignId: setup.oxfordAuditEvidenceId });
  expect(linked).toBe(404);
  const reaudit = await page.evaluate(async ({ auditId, findingId, foreignId }) => {
    const form = new FormData(); form.set("reviewDate", new Date().toISOString().slice(0, 10)); form.set("outcome", "INSUFFICIENT_EVIDENCE"); form.set("result", "Fictional cross-location negative test result."); form.set("decision", "Keep this finding open pending authorised evidence."); form.set("evidenceIds", foreignId);
    return (await fetch(`/api/audits/${auditId}/findings/${findingId}/reaudits`, { method: "POST", body: form })).status;
  }, { auditId, findingId, foreignId: setup.oxfordAuditEvidenceId });
  expect(reaudit).toBe(400);
  await expect(page.getByText("E2E Oxford-only audit source")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath(`wp007-audit-finding-${testInfo.project.name}.png`), fullPage: true });
});

async function fixture(request: APIRequestContext): Promise<Setup> {
  return (await (await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).json()) as Setup;
}

async function startAudit(page: Page, setup: Setup) {
  await page.goto(`/audits/new?template=${setup.audit.template.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Service / location").selectOption(setup.audit.locationId);
  await page.getByText("Optional setup").click();
  await page.getByLabel("Custom audit title").fill(`E2E-AUDIT-WP007-${Date.now()}`);
  await page.getByRole("button", { name: "Start audit now" }).click();
  await expect(page).toHaveURL(/\/audits\/[0-9a-f-]+#audit-form/);
  await page.waitForLoadState("networkidle");
  return page.url().match(/\/audits\/([0-9a-f-]+)/)![1];
}
