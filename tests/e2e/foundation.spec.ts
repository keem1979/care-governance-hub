import { expect, test } from "@playwright/test";

test("shows an accessible sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to your governance hub" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in securely" })).toBeVisible();
});

test("protects the dashboard from unauthenticated access", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
});
