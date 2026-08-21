import { expect, test } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type Setup = {
  actions: Record<string, { id: string }>;
};

test("Action assurance remains usable on a mobile viewport", async ({ page, request }) => {
  test.setTimeout(300_000);
  const reset = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(reset.status()).toBe(200);
  const response = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  const setup = await response.json() as Setup;
  const high = setup.actions["E2E-ACT-ASSURANCE-HIGH"], dependency = setup.actions["E2E-ACT-ASSURANCE-DEPENDENCY"];

  await signIn(page, E2E_USERS.registeredManager);
  await page.goto(`/actions/${high.id}/assurance`, { waitUntil: "domcontentloaded" });
  await expectNoOverflow(page);
  await expect(page.getByRole("heading", { name: "3. Role-aware Evidence" })).toBeVisible();

  const search = page.getByLabel("Search Evidence Library");
  await search.fill("E2E");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("E2E corrected completion evidence").first()).toBeVisible();
  await expectNoOverflow(page);

  await expect(page.getByLabel("Verification outcome")).toBeVisible();
  await expect(page.getByLabel("Effectiveness outcome")).toBeVisible();
  await expect(page.getByLabel("Closure evidence")).toBeVisible();
  await expectPracticalTouchTarget(page.getByRole("button", { name: "Record verification" }));
  await expectPracticalTouchTarget(page.getByRole("button", { name: "Record effectiveness review" }));
  await expectPracticalTouchTarget(page.getByRole("button", { name: "Authorise closure" }));

  await page.goto(`/actions/${dependency.id}/assurance`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Fictional Specialist Service")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record chase" })).toBeVisible();
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
