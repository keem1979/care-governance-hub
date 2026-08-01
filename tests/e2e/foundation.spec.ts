import { expect, test } from "@playwright/test";

test("shows an accessible sign-in form", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Sign in to QCGMS" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in securely" })).toBeEnabled({ timeout: 15_000 });
});

test("protects the dashboard from unauthenticated access", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
});

test("shows the tenant-scoped dashboard after sign-in", async ({ page }) => {
  await page.goto("/login?returnTo=%2Fdashboard", {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email address").fill("owner@meadowview.demo");
  await page.getByLabel("Password").fill("DemoCare!2026");
  const signIn = page.getByRole("button", { name: "Sign in securely" });
  await expect(signIn).toBeEnabled();
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST",
  );
  await signIn.click();
  expect((await loginResponse).status()).toBe(200);

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening), Olivia/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Meadow View Home Care Ltd", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("What needs attention")).toBeVisible();
  await expect(page.getByText("For your team’s internal oversight")).toBeVisible();
  await page.goto("/clients", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Client Directory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add client" })).toBeVisible();
});

test("opens the connected Action Tracker and its natural entry form", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login?returnTo=%2Factions", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill("owner@meadowview.demo");
  await page.getByLabel("Password").fill("DemoCare!2026");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await page.goto("/actions", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/actions$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Action Tracker" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Compliance calendar", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Action evidence" })).toBeVisible();
  await page.goto("/actions/new", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Create improvement action" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Expected outcome")).toBeVisible();
  await expect(page.getByLabel("How will success be measured?")).toBeVisible();
  await expect(page.getByLabel("Source record")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create and connect action" })).toBeVisible();
});
