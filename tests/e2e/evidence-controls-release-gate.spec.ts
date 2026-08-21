import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USER, E2E_USERS } from "./fixtures";

test("authenticated Medicines Risk uses governed Provider Controls and role-aware Evidence", async ({ page, browser }) => {
  test.setTimeout(600_000);
  const runKey = Date.now();
  const draftTitle = `E2E medicines control ${runKey}`;
  const approvedTitle = `E2E edited medicines control ${runKey}`;
  const v2Title = `${approvedTitle} v2`;
  const extensionLabel = `Medicines assurance subtype ${runKey}`;
  const today = new Date().toISOString().slice(0, 10);
  const reviewDate = dateAfter(180);

  await signIn(page);
  await page.goto("/settings/provider-controls", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Provider Control Library" })).toBeVisible();

  const create = page.getByText("Create a Provider Control draft", { exact: true }).locator("..");
  await create.getByText("Create a Provider Control draft", { exact: true }).click();
  await create.getByLabel("Control title").fill(draftTitle);
  await create.getByLabel("Control family").selectOption("PROCESS");
  await create.getByLabel("Description").fill("A monthly medicines audit is reviewed with competency evidence and a documented management response.");
  await create.getByLabel("Accountable Control owner").selectOption({ label: E2E_USER.name });
  await create.getByLabel("Scope").selectOption("SELECTED_LOCATIONS");
  await create.getByLabel("Guildford Branch").check();
  await create.getByLabel("Medicines", { exact: true }).check();
  await create.getByLabel("Expected Evidence family").selectOption("MEDICINES");
  await create.getByLabel("Expected Evidence type").selectOption("MEDICATION_AUDIT");
  await create.getByLabel("Normal effectiveness method").fill("Review the next MAR audit sample after the control has operated.");
  await create.getByLabel("Effective from").fill(today);
  await create.getByLabel("Review due").fill(reviewDate);
  await create.getByLabel("Draft rationale").fill("Release-gate proof of the controlled Draft lifecycle.");
  const createResponse = page.waitForResponse(
    response => response.url().endsWith("/api/settings/provider-controls") && response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await create.getByRole("button", { name: "Create governed Draft" }).click();
  const created = await createResponse;
  expect(created.status()).toBe(201);
  const controlId = ((await created.json()) as { id: string }).id;

  const draftEditor = page.locator("details").filter({ hasText: "Edit Draft Provider Control" }).first();
  await expect(draftEditor).toBeVisible({ timeout: 60_000 });
  await draftEditor.locator("summary").click();
  await draftEditor.getByLabel("What is this Control?").fill(approvedTitle);
  await draftEditor.getByLabel("How does it operate?").fill("The Registered Manager reviews the monthly medicines audit, current competency Evidence and any exception response.");
  await draftEditor.getByLabel("Change rationale").fill("Draft reviewed and clarified before approval for the release gate.");
  const editResponse = page.waitForResponse(
    response => response.url().endsWith(`/api/settings/provider-controls/${controlId}`) && response.request().method() === "PATCH",
    { timeout: 120_000 },
  );
  await draftEditor.getByRole("button", { name: "Save Draft changes" }).click();
  expect((await editResponse).status()).toBe(200);

  const draftCard = page.locator("article").filter({ hasText: approvedTitle }).first();
  await expect(draftCard.getByText("DRAFT", { exact: true })).toBeVisible({ timeout: 60_000 });
  const activateResponse = page.waitForResponse(
    response => response.url().endsWith(`/api/settings/provider-controls/${controlId}`) && response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await draftCard.getByRole("button", { name: /Activate Draft|Approve and activate Draft/ }).click();
  expect((await activateResponse).status()).toBe(200);
  await expect(page.locator("article").filter({ hasText: approvedTitle }).getByText("EFFECTIVE", { exact: true })).toBeVisible({ timeout: 60_000 });

  const fixture = await page.evaluate(async token => {
    const response = await fetch("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": token } });
    return response.json() as Promise<{ risks: Record<string, { id: string; locationId: string }> }>;
  }, E2E_SETUP_TOKEN);
  const riskId = fixture.risks["E2E-RSK-SEC-READY"].id;
  const guildfordLocationId = fixture.risks["E2E-RSK-SEC-READY"].locationId;

  await page.goto(`/risks/${riskId}`, { waitUntil: "domcontentloaded" });
  await page.getByText("Suggested Evidence", { exact: true }).click();
  await expect(page.getByText("E2E verified governance source", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Medicines · Medication audit/).first()).toBeVisible();
  const suggestion = page.locator("article").filter({ hasText: approvedTitle }).first();
  const applyResponse = page.waitForResponse(
    response => response.url().endsWith(`/api/risks/${riskId}/controls`) && response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await suggestion.getByRole("button", { name: "Confirm this Control applies" }).click();
  expect((await applyResponse).status()).toBe(201);

  await linkEvidenceFromServerSearch(page, riskId, approvedTitle, "CONTROL");
  await linkEvidenceFromServerSearch(page, riskId, approvedTitle, "EFFECTIVENESS");
  const application = page.locator("article").filter({ hasText: approvedTitle }).first();
  await expect(application.getByText(/CONTROL · Current verified/i)).toBeVisible({ timeout: 60_000 });
  await expect(application.getByText(/EFFECTIVENESS · Current verified/i)).toBeVisible();

  await application.getByText("Link Evidence or assess effectiveness", { exact: true }).click();
  await application.getByLabel("Professional judgement").selectOption("EFFECTIVE");
  await application.getByLabel("Method").fill("Reviewed the subsequent MAR audit sample against the prior exception baseline.");
  await application.getByLabel("Rationale").fill("The follow-up sample contained no repeat exception and the linked Evidence supports this review period.");
  const effectivenessResponse = page.waitForResponse(
    response => response.url().endsWith(`/api/risks/${riskId}/controls`) && response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await application.getByRole("button", { name: "Record effectiveness review" }).click();
  expect((await effectivenessResponse).status()).toBe(201);
  await expect(page.locator("article").filter({ hasText: approvedTitle }).getByText("Effectiveness: EFFECTIVE", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("article").filter({ hasText: approvedTitle }).getByText("✓ No deterministic assurance gap identified.")).toBeVisible();

  // A new approved version must not rewrite the snapshot already applied to the Risk.
  await page.goto("/settings/provider-controls", { waitUntil: "domcontentloaded" });
  const effectiveCard = page.locator("article").filter({ hasText: approvedTitle }).first();
  const newVersionResponse = page.waitForResponse(
    response => response.url().endsWith(`/api/settings/provider-controls/${controlId}`) && response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await effectiveCard.getByRole("button", { name: "Create new version" }).click();
  expect((await newVersionResponse).status()).toBe(200);
  const v2Editor = page.locator("details").filter({ hasText: "Edit Draft Provider Control" }).first();
  await expect(v2Editor).toBeVisible({ timeout: 60_000 });
  await v2Editor.locator("summary").click();
  await v2Editor.getByLabel("What is this Control?").fill(v2Title);
  await v2Editor.getByLabel("Effective from").fill(today);
  await v2Editor.getByLabel("Change rationale").fill("Controlled supersession test; the original Risk snapshot must remain unchanged.");
  const saveV2 = page.waitForResponse(response => response.url().endsWith(`/api/settings/provider-controls/${controlId}`) && response.request().method() === "PATCH", { timeout: 120_000 });
  await v2Editor.getByRole("button", { name: "Save Draft changes" }).click();
  expect((await saveV2).status()).toBe(200);
  const v2Card = page.locator("article").filter({ hasText: v2Title }).first();
  const activateV2 = page.waitForResponse(response => response.url().endsWith(`/api/settings/provider-controls/${controlId}`) && response.request().method() === "POST", { timeout: 120_000 });
  await v2Card.getByRole("button", { name: /Activate Draft|Approve and activate Draft/ }).click();
  expect((await activateV2).status()).toBe(200);

  await page.goto(`/risks/${riskId}`, { waitUntil: "domcontentloaded" });
  const historicalApplication = page.locator("article").filter({ hasText: approvedTitle }).first();
  await expect(historicalApplication.getByText(/applied v1/i)).toBeVisible();
  await expect(historicalApplication.getByText("REVIEW REQUIRED", { exact: true })).toBeVisible();
  await expect(historicalApplication.getByText(/changed, retired or requires review/i)).toBeVisible();

  await page.goto("/settings/provider-controls", { waitUntil: "domcontentloaded" });
  const retireCard = page.locator("article").filter({ hasText: v2Title }).first();
  const retireResponse = page.waitForResponse(response => response.url().endsWith(`/api/settings/provider-controls/${controlId}`) && response.request().method() === "POST", { timeout: 120_000 });
  await retireCard.getByRole("button", { name: "Retire" }).click();
  expect((await retireResponse).status()).toBe(200);
  await page.goto(`/risks/${riskId}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("article").filter({ hasText: approvedTitle }).getByText(/applied v1/i)).toBeVisible();

  // Provider extension remains subordinate to the core family.
  await page.goto("/settings/provider-controls", { waitUntil: "domcontentloaded" });
  const extensions = page.getByText("Provider Evidence type extensions", { exact: true }).locator("..");
  await extensions.getByText("Provider Evidence type extensions", { exact: true }).click();
  await extensions.getByLabel("Core family").selectOption("MEDICINES");
  await extensions.getByLabel("Extension label").fill(extensionLabel);
  await extensions.getByLabel("Currentness behaviour").selectOption("REVIEW_BASED");
  await extensions.getByLabel("Owner").selectOption({ label: E2E_USER.name });
  const extensionResponse = page.waitForResponse(response => response.url().endsWith("/api/settings/provider-evidence-types") && response.request().method() === "POST", { timeout: 120_000 });
  await extensions.getByRole("button", { name: "Add provider extension" }).click();
  const createdExtensionResponse = await extensionResponse;
  expect(createdExtensionResponse.status()).toBe(201);
  const extensionId = ((await createdExtensionResponse.json()) as { id: string }).id;
  await expect(page.getByText(extensionLabel, { exact: false })).toBeVisible({ timeout: 60_000 });
  const extensionCard = page.locator("div").filter({ hasText: extensionLabel }).filter({ has: page.getByRole("button", { name: "Retire extension" }) }).last();
  const retirementResponse = page.waitForResponse(response => response.url().endsWith(`/api/settings/provider-evidence-types/${extensionId}`) && response.request().method() === "POST", { timeout: 120_000 });
  await extensionCard.getByRole("button", { name: "Retire extension" }).click();
  expect((await retirementResponse).status()).toBe(200);
  await expect(page.locator("div").filter({ hasText: extensionLabel }).last()).toContainText("RETIRED", { timeout: 60_000 });

  const origin = new URL(page.url()).origin;
  const viewerContext = await browser.newContext({ baseURL: origin });
  const viewer = await viewerContext.newPage();
  await signIn(viewer, E2E_USERS.viewer);
  const viewerControl = await viewer.evaluate(async id => {
    const response = await fetch(`/api/settings/provider-controls/${id}`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: "RETIRE" }) });
    return { status: response.status, type: response.type };
  }, controlId);
  expect(viewerControl).toEqual({ status: 0, type: "opaqueredirect" });
  const viewerSearch = await viewer.evaluate(async id => {
    const response = await fetch(`/api/risks/${id}/evidence-search?q=E2E`, { redirect: "manual" });
    return { status: response.status, type: response.type };
  }, riskId);
  expect(viewerSearch).toEqual({ status: 0, type: "opaqueredirect" });
  await viewerContext.close();

  const restrictedContext = await browser.newContext({ baseURL: origin });
  const restricted = await restrictedContext.newPage();
  await signIn(restricted, E2E_USERS.locationRestricted);
  const restrictedOrganisationControl = await createControlByApi(restricted, { title: `Forbidden organisation Control ${runKey}`, scopeType: "ORGANISATION", locationIds: [] });
  expect(restrictedOrganisationControl).toBe(400);
  const restrictedOtherLocation = await createControlByApi(restricted, { title: `Forbidden location Control ${runKey}`, scopeType: "SELECTED_LOCATIONS", locationIds: [guildfordLocationId] });
  expect(restrictedOtherLocation).toBe(400);
  await restrictedContext.close();

  const otherTenantContext = await browser.newContext({ baseURL: origin });
  const otherTenant = await otherTenantContext.newPage();
  await signIn(otherTenant, E2E_USERS.otherTenant);
  await otherTenant.goto(`/risks/${riskId}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(otherTenant.getByText(/page could not be found/i)).toBeVisible();
  await otherTenantContext.close();
});

async function linkEvidenceFromServerSearch(page: Page, riskId: string, controlTitle: string, role: "CONTROL" | "EFFECTIVENESS") {
  const search = page.locator("details").filter({ hasText: "Search authorised Evidence" }).first();
  if (!(await search.evaluate(element => (element as HTMLDetailsElement).open))) {
    await search.locator("summary").click();
  }
  await search.getByLabel("Search Evidence").fill("E2E verified governance source");
  await search.getByLabel("Evidence family").selectOption("MEDICINES");
  await search.getByLabel("Evidence type").selectOption("MEDICATION_AUDIT");
  const queryResponse = page.waitForResponse(response => response.url().includes(`/api/risks/${riskId}/evidence-search`) && response.request().method() === "GET", { timeout: 120_000 });
  await search.getByRole("button", { name: "Search Evidence" }).click();
  expect((await queryResponse).status()).toBe(200);
  await expect(search.getByText(/Medicines · Medication audit/)).toBeVisible();
  await search.getByLabel("Applied Control").selectOption({ label: controlTitle });
  await search.getByLabel("Evidence role").selectOption(role);
  const linkResponse = page.waitForResponse(response => response.url().endsWith(`/api/risks/${riskId}/controls`) && response.request().method() === "POST", { timeout: 120_000 });
  await search.locator("li").filter({ hasText: "E2E verified governance source" }).getByRole("button").click();
  expect((await linkResponse).status()).toBe(200);
}

async function createControlByApi(page: Page, input: { title: string; scopeType: string; locationIds: string[] }) {
  return page.evaluate(async body => {
    const response = await fetch("/api/settings/provider-controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        description: "This deliberately invalid scope is used only for release-gate access testing.",
        family: "PROCESS",
        applicableRiskCategoryKeys: ["MEDICINES"],
        accountableOwnerId: null,
        expectedEvidenceFamilyKeys: ["MEDICINES"],
        expectedEvidenceTypeKeys: ["MEDICINES:MEDICATION_AUDIT"],
        expectedEffectivenessMethod: "Review a later audit sample.",
        effectiveFrom: null,
        reviewDueAt: null,
        changeRationale: "Release-gate scope denial test.",
      }),
    });
    return response.status;
  }, input);
}

function dateAfter(days: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
