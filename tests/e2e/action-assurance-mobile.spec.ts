import { expect, test } from "@playwright/test";
import { e2eGoto, signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type Setup = {
  actions: Record<string, { id: string }>;
};

test("Action assurance remains usable on a mobile viewport", async ({ page, request }, testInfo) => {
  test.setTimeout(300_000);
  const reset = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(reset.status()).toBe(200);
  const response = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  const setup = await response.json() as Setup;
  const high = setup.actions["E2E-ACT-ASSURANCE-HIGH"], dependency = setup.actions["E2E-ACT-ASSURANCE-DEPENDENCY"], low = setup.actions["E2E-ACT-ASSURANCE-LOW"];

  await signIn(page, E2E_USERS.registeredManager);
  await e2eGoto(page, "/actions");
  await expect(page.getByRole("heading", { name: "What needs action now?" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Quick views" })).toBeVisible();
  await expectNoOverflow(page);

  await e2eGoto(page, "/actions/new");
  await expect(page.getByRole("heading", { name: "Create improvement action" })).toBeVisible();
  const ownerSearch = page.getByLabel("Who owns this Action?");
  const ownerResponse = page.waitForResponse(response => response.url().includes("/api/actions/authorised-options?") && response.url().includes("kind=OWNER"));
  await ownerSearch.fill("reg");
  expect((await ownerResponse).status()).toBe(200);
  await expect(page.getByRole("option").filter({ hasText: E2E_USERS.registeredManager.name }).first()).toBeVisible();
  await expectNoOverflow(page);

  await e2eGoto(page, `/actions/${high.id}/assurance`);
  await expect(page.getByRole("button", { name: /Chat with Abi/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Management assurance decision" })).toContainText("Needs attention");
  await page.screenshot({ path: testInfo.outputPath("wp005-needs-attention-mobile.png"), fullPage: true });
  await expectNoOverflow(page);
  await expect(page.getByRole("heading", { name: "3. Role-aware Evidence" })).toBeVisible();

  await page.getByRole("button", { name: "Add Evidence" }).click();
  const evidenceDrawer = page.getByRole("dialog", { name: "Add Evidence" });
  await expect(evidenceDrawer).toBeVisible();
  await evidenceDrawer.getByRole("button", { name: "Use existing Evidence" }).click();
  const search = evidenceDrawer.getByRole("textbox", { name: "Search Evidence" });
  await search.fill("E2E");
  await evidenceDrawer.getByRole("button", { name: "Search", exact: true }).click();
  await expect(evidenceDrawer.getByRole("button", { name: /E2E corrected completion evidence/ }).first()).toBeVisible();
  await expectNoOverflow(page);
  await expectPracticalTouchTarget(evidenceDrawer.getByRole("button", { name: "Close", exact: true }));
  await evidenceDrawer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(evidenceDrawer).not.toBeVisible();

  await expect(page.getByLabel("Verification outcome")).toBeVisible();
  await expect(page.getByLabel("Effectiveness outcome")).toBeVisible();
  await expect(page.getByLabel("Closure evidence")).toBeVisible();
  await expectPracticalTouchTarget(page.getByRole("button", { name: "Record verification" }));
  await expectPracticalTouchTarget(page.getByRole("button", { name: "Record effectiveness review" }));
  await expectPracticalTouchTarget(page.getByRole("button", { name: "Authorise closure" }));

  await e2eGoto(page, `/actions/${low.id}/assurance`);
  await expect(page.getByRole("region", { name: "Management assurance decision" })).toContainText("Ready for management review");
  await page.screenshot({ path: testInfo.outputPath("wp005-ready-mobile.png"), fullPage: true });
  await expectNoOverflow(page);

  await e2eGoto(page, `/actions/${dependency.id}/assurance`);
  await expect(page.getByText("Fictional Specialist Service")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record chase" })).toBeVisible();
  await expectNoOverflow(page);

  await e2eGoto(page, "/management");
  await expect(page.getByRole("heading", { name: "Management Oversight" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Oversight summary" })).toBeVisible();
  await expectNoOverflow(page);
});

async function expectNoOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

async function expectPracticalTouchTarget(locator: import("@playwright/test").Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(40);
  expect(box!.width).toBeGreaterThanOrEqual(40);
}
