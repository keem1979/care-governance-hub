import { expect, type Page } from "@playwright/test";
import { generateTotp } from "@/lib/auth/mfa";
import { E2E_MFA_SECRET, E2E_USER } from "./fixtures";

export async function signIn(page: Page): Promise<void> {
  await page.goto("/login?returnTo=%2Fdashboard", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(E2E_USER.email);
  await page.getByLabel("Password").fill(E2E_USER.password);

  async function submit() {
    const response = page.waitForResponse((item) =>
      item.url().endsWith("/api/auth/login") && item.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign in securely" }).click();
    return response;
  }

  let response = await submit();
  if (response.status() === 409) {
    await page.getByLabel("Authenticator or recovery code").fill(generateTotp(E2E_MFA_SECRET));
    response = await submit();
  }
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { mfaSetupRequired?: boolean };

  if (body.mfaSetupRequired) {
    await expect(page).toHaveURL(/\/security$/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Start secure setup" }).click();
    const enrolledSecret = (await page.locator("code").first().textContent())?.trim() ?? null;
    expect(enrolledSecret).toBe(E2E_MFA_SECRET);
    await page.getByLabel("Six-digit verification code").fill(generateTotp(E2E_MFA_SECRET));
    await page.getByRole("button", { name: "Verify and enable MFA" }).click();
    await expect(page.getByRole("heading", { name: "Save these one-time recovery codes" })).toBeVisible();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  } else {
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  }
}
