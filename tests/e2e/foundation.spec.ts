import { expect, test, type Page } from "@playwright/test";
import { generateTotp } from "@/lib/auth/mfa";

const e2eMfaSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

async function signIn(page: Page): Promise<void> {
  await page.goto("/login?returnTo=%2Fdashboard", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill("owner@meadowview.demo");
  await page.getByLabel("Password").fill("DemoCare!2026");

  async function submit() {
    const response = page.waitForResponse((item) =>
      item.url().endsWith("/api/auth/login") && item.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign in securely" }).click();
    return response;
  }

  let response = await submit();
  if (response.status() === 409) {
    await page.getByLabel("Authenticator or recovery code").fill(generateTotp(e2eMfaSecret));
    response = await submit();
  }
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { mfaSetupRequired?: boolean };

  if (body.mfaSetupRequired) {
    await expect(page).toHaveURL(/\/security$/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Start secure setup" }).click();
    const enrolledSecret = (await page.locator("code").first().textContent())?.trim() ?? null;
    expect(enrolledSecret).toBe(e2eMfaSecret);
    await page.getByLabel("Six-digit verification code").fill(generateTotp(e2eMfaSecret));
    await page.getByRole("button", { name: "Verify and enable MFA" }).click();
    await expect(page.getByRole("heading", { name: "Save these one-time recovery codes" })).toBeVisible();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  } else {
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  }
}

test("shows an accessible sign-in form", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Sign in to QCGMS" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: /(Sign in securely|Preparing secure sign-in)/i })).toBeVisible({ timeout: 30_000 });
});

test("protects the dashboard from unauthenticated access", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
});

test("sets browser protections and rejects a cross-site sign-in request", async ({ request }) => {
  const pageResponse = await request.get("/login");
  expect(pageResponse.headers()["x-frame-options"]).toBe("DENY");
  expect(pageResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(pageResponse.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");

  const crossSite = await request.post("/api/auth/login", {
    headers: { Origin: "https://untrusted.example", "Sec-Fetch-Site": "cross-site" },
    data: { email: "owner@meadowview.demo", password: "DemoCare!2026" },
  });
  expect(crossSite.status()).toBe(403);
});

test("shows the tenant-scoped dashboard after sign-in", async ({ page }) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening), Olivia/ }),
  ).toBeVisible();
  await expect(page.getByText("What needs attention")).toBeVisible();
  await expect(page.getByText("For your team’s internal oversight")).toBeVisible();
  await page.goto("/clients", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Client Directory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add client" })).toBeVisible();
});

test("opens the connected Action Tracker and its natural entry form", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  await page.goto("/actions", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/actions$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Action Tracker" })).toBeVisible();
  await expect(page.getByText("One record from finding through response, evidence, verified closure, recurrence monitoring and sustained improvement.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create action" })).toBeVisible();
  await page.goto("/actions/new", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Create improvement action" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Expected outcome")).toBeVisible();
  await expect(page.getByLabel("How will success be measured?")).toBeVisible();
  await expect(page.getByLabel("Source record")).toBeVisible();
  await expect(page.getByRole("button", { name: "Check and create action" })).toBeVisible();
});

test("shows Care Quality as a connected overview rather than a duplicate register", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  await page.goto("/quality", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Quality & Outcomes Overview" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Quality pathways" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest quality signals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quality attention queue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One source of truth—no duplicate records" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quality assurance report", exact: true })).toBeVisible();
});

test("shows the RM-grade Inspection Centre with calculated assurance and one framework", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/inspection", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Inspection Centre" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Registered Manager assurance workspace")).toBeVisible();
  await expect(page.getByText("Calculated assurance", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Framework coverage" })).toBeVisible();
  await expect(page.getByRole("link", { name: "RM assurance pack" })).toBeVisible();
  await page.goto("/inspection?view=framework", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/view=framework/);
  await expect(page.getByRole("heading", { name: "Six CQC evidence categories" })).toBeVisible();
  await page.goto("/evidence/requirements", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/inspection\?view=framework$/);
});
