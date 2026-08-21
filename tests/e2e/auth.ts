import { expect, type Page } from "@playwright/test";
import { generateTotp } from "@/lib/auth/mfa";
import { E2E_USER, type E2EUser } from "./fixtures";

export async function signIn(page: Page, user:E2EUser=E2E_USER): Promise<void> {
  await page.goto("/login?returnTo=%2Fdashboard", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill(user.password);

  async function submit() {
    const response = page.waitForResponse((item) =>
      item.url().endsWith("/api/auth/login") && item.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign in securely" }).click();
    return response;
  }

  let response = await submit();
  if (response.status() === 409) {
    await page.getByLabel("Authenticator or recovery code").fill(generateTotp(user.mfaSecret));
    response = await submit();
  }
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { mfaSetupRequired?: boolean };

  if (body.mfaSetupRequired) {
    await expect(page).toHaveURL(/\/security$/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Start secure setup" }).click();
    const enrolledSecret = (await page.locator("code").first().textContent())?.trim() ?? null;
    expect(enrolledSecret).toBe(user.mfaSecret);
    await page.getByLabel("Six-digit verification code").fill(generateTotp(user.mfaSecret));
    await page.getByRole("button", { name: "Verify and enable MFA" }).click();
    await expect(page.getByRole("heading", { name: "Save these one-time recovery codes" })).toBeVisible();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  } else {
    // The authenticated cookie is authoritative. Explicit navigation avoids a
    // development-server router race after MFA while still proving the guarded
    // dashboard accepts the independently authenticated session.
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  }
}
