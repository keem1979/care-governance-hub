import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { e2eGoto, signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type Setup = {
  actions: Record<string, { id: string }>;
  incidents: Record<string, { id: string }>;
  complaints: Record<string, { id: string }>;
  safeguarding: Record<string, { id: string }>;
  evidenceId: string;
};

const output = resolve(process.env.QCGMS_VISUAL_OUTPUT_DIR ?? "test-results/ui-review");

test.afterEach(() => runVisualFixture("restore"));

test("capture the real QCGMS visual UX evidence set", async ({ page, request }, testInfo) => {
  test.setTimeout(600_000);
  mkdirSync(output, { recursive: true });
  runVisualFixture("restore");
  const reset = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(reset.status()).toBe(200);
  const setupResponse = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  const setup = await setupResponse.json() as Setup;
  const visual = JSON.parse(runVisualFixture("prepare", setup)) as { clientId: string; staffId: string };
  const browserErrors: string[] = [];
  const httpErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) browserErrors.push(message.text());
  });
  page.on("response", (response) => {
    const expectedMfaChallenge = response.status() === 409 && response.url().endsWith("/api/auth/login");
    if (response.status() >= 400 && !expectedMfaChallenge) httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });

  const mobile = testInfo.project.name === "mobile";
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await signIn(page, E2E_USERS.registeredManager);

  if (mobile) {
    await capture(page, "/dashboard", "m01-command-centre-mobile.png");
    await capture(page, "/registers/safeguarding", "m02-safeguarding-worklist-mobile.png");
    await capture(page, `/registers/safeguarding/${setup.safeguarding["E2E-SG-READY"].id}`, "m03-safeguarding-detail-mobile.png");
    await capture(page, `/actions/${setup.actions["E2E-ACT-ASSURANCE-INEFFECTIVE"].id}`, "m04-action-detail-mobile.png");
    await capture(page, "/my-work", "m09-my-work-progressive-mobile.png");
    await capture(page, `/clients/${visual.clientId}`, "m05-client-profile-mobile.png");
    await capture(page, `/workforce/${visual.staffId}`, "m06-staff-profile-mobile.png");
    await openQuickFind(page, "Bennett");
    await screen(page, "m07-global-quick-find-mobile.png", false);
    await openEvidenceDrawer(page, setup.actions["E2E-ACT-ASSURANCE-HIGH"].id);
    await screen(page, "m08-evidence-drawer-mobile.png", false);
  } else {
    await capture(page, "/dashboard", "01-command-centre-desktop.png");
    await capture(page, "/registers/incidents", "02-incidents-worklist-desktop.png");
    await capture(page, "/registers/complaints", "03-complaints-worklist-desktop.png");
    await capture(page, "/registers/safeguarding", "04-safeguarding-worklist-desktop.png");
    await capture(page, `/registers/safeguarding/${setup.safeguarding["E2E-SG-READY"].id}`, "05-safeguarding-detail-desktop.png");
    await capture(page, `/registers/complaints/${setup.complaints["E2E-CMP-READY"].id}`, "06-complaint-detail-desktop.png");
    await capture(page, `/registers/incidents/${setup.incidents["E2E-INC-READY"].id}`, "16-incident-detail-progressive-desktop.png");
    await capture(page, `/registers/complaints/${setup.complaints["E2E-CMP-READY"].id}`, "17-complaint-detail-progressive-desktop.png");
    await capture(page, `/registers/safeguarding/${setup.safeguarding["E2E-SG-READY"].id}`, "18-safeguarding-detail-progressive-desktop.png");
    await capture(page, "/actions", "07-actions-worklist-desktop.png");
    await capture(page, `/actions/${setup.actions["E2E-ACT-ASSURANCE-INEFFECTIVE"].id}`, "08-action-detail-desktop.png");
    await capture(page, `/actions/${setup.actions["E2E-ACT-ASSURANCE-INEFFECTIVE"].id}`, "19-action-detail-progressive-desktop.png");
    await capture(page, "/my-work", "20-my-work-progressive-desktop.png");
    await openEvidenceDrawer(page, setup.actions["E2E-ACT-ASSURANCE-HIGH"].id);
    await screen(page, "09-evidence-drawer-desktop.png", false);
    await capture(page, "/management", "10-management-oversight-desktop.png");
    await capture(page, `/clients/${visual.clientId}`, "11-client-profile-desktop.png");
    await capture(page, `/workforce/${visual.staffId}`, "12-staff-profile-desktop.png");
    await openQuickFind(page, "Bennett");
    await screen(page, "13-global-quick-find-desktop.png", false);
    await capture(page, "/registers/safeguarding/new", "14-safeguarding-capture-desktop.png");
    await page.setViewportSize({ width: 1024, height: 768 });
    await capture(page, "/management", "15-management-oversight-tablet.png");
  }

  expect(browserErrors, browserErrors.join("\n")).toEqual([]);
  expect(httpErrors, httpErrors.join("\n")).toEqual([]);
});

function runVisualFixture(mode: "restore" | "prepare", setup?: Setup) {
  const encodedSetup = setup ? Buffer.from(JSON.stringify(setup), "utf8").toString("base64url") : "";
  return execFileSync(process.execPath, ["--experimental-strip-types", "scripts/prepare-visual-ux-fixtures.ts", mode, encodedSetup], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  }).trim();
}

async function capture(page: Page, route: string, filename: string) {
  await e2eGoto(page, route);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveText("");
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  if (route.includes("/registers/") && route.split("/").length > 3 && !route.endsWith("/new")) await expect(page.locator("#current-work")).toBeVisible();
  await screen(page, filename, true);
}

async function screen(page: Page, filename: string, fullPage: boolean) {
  await page.screenshot({ path: join(output, filename), fullPage, animations: "disabled" });
}

async function openQuickFind(page: Page, query: string) {
  await e2eGoto(page, "/dashboard");
  await page.keyboard.press("Control+K");
  const dialog = page.getByRole("dialog", { name: "Quick find" });
  await expect(dialog).toBeVisible();
  const response = page.waitForResponse((item) => item.url().includes("/api/quick-find?") && item.status() === 200);
  await dialog.getByLabel("Quick find authorised records").fill(query);
  await response;
  await expect(dialog.getByRole("heading", { name: "Clients" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Staff" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Safeguarding" })).toBeVisible();
}

async function openEvidenceDrawer(page: Page, actionId: string) {
  await e2eGoto(page, `/actions/${actionId}/assurance`);
  await page.getByRole("button", { name: "Add Evidence" }).click();
  const drawer = page.getByRole("dialog", { name: "Add Evidence" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Use existing Evidence" }).click();
  await drawer.getByLabel("Search Evidence").fill("Medication governance audit");
  await drawer.getByRole("button", { name: "Search", exact: true }).click();
  await drawer.getByRole("button", { name: /Medication governance audit — July 2026/ }).first().click();
  await expect(drawer.getByRole("heading", { name: "Preview" })).toBeVisible();
}
