import { expect, type Page, type Request } from "@playwright/test";
import { generateTotp } from "@/lib/auth/mfa";
import { E2E_USER, type E2EUser } from "./fixtures";

export async function signIn(page: Page, user:E2EUser=E2E_USER): Promise<void> {
  await e2eGoto(page, "/login?returnTo=%2Fdashboard");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill(user.password);

  async function submit() {
    return retrySuspendedLoopback(page, async () => {
      const response = page.waitForResponse((item) =>
        item.url().endsWith("/api/auth/login") && item.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Sign in securely" }).click();
      return response;
    });
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
    await navigateAfterAuthentication(page, "/dashboard");
  } else {
    // The authenticated cookie is authoritative. Explicit navigation avoids a
    // development-server router race after MFA while still proving the guarded
    // dashboard accepts the independently authenticated session.
    await navigateAfterAuthentication(page, "/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  }
}

async function navigateAfterAuthentication(page: Page, path: string) {
  await e2eGoto(page, path);
}

export async function e2eGoto(page: Page, path: string) {
  await retrySuspendedLoopback(page, () => page.goto(path, { waitUntil: "domcontentloaded" }));
}

export async function e2eReload(page: Page) {
  await retrySuspendedLoopback(page, () => page.reload({ waitUntil: "domcontentloaded" }));
}

async function retrySuspendedLoopback<T>(page: Page, operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let suspended = false;
    const onRequestFailed = (request: Request) => {
      if (request.failure()?.errorText.includes("ERR_NETWORK_IO_SUSPENDED")) suspended = true;
    };
    page.on("requestfailed", onRequestFailed);
    try { return await operation(); }
    catch (error) {
      // Windows may briefly suspend a loopback navigation while a browser
      // context is being switched. A suspended request can also surface as a
      // wait timeout. Retry only when the browser reported that OS condition;
      // server, authentication and HTTP failures remain visible.
      const transportFailure = error instanceof Error && (
        error.message.includes("ERR_NETWORK_IO_SUSPENDED") ||
        (suspended && error.message.includes("Timeout"))
      );
      if (!transportFailure || attempt === 2) throw error;
      await page.waitForTimeout(250 * (attempt + 1));
    } finally {
      page.off("requestfailed", onRequestFailed);
    }
  }
  throw new Error("Unreachable loopback retry state");
}
