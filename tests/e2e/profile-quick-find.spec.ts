import { expect, test } from "@playwright/test";
import { e2eGoto, signIn } from "./auth";
import { E2E_USERS } from "./fixtures";

test.describe.serial("authorised profiles and Global Quick Find", () => {
  test("opens Client and Staff governance profiles and carries known Client context into an Action", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await signIn(page, E2E_USERS.registeredManager);

    await page.getByRole("button", { name: "Quick find clients, staff and governance records" }).click();
    const quickFind = page.locator("dialog");
    const search = page.getByRole("combobox", { name: "Quick find authorised records" });
    await search.fill("E2E-CLI-0001");
    const clientResult = quickFind.getByRole("option").filter({ hasText: "E2E-CLI-0001" });
    await expect(clientResult).toBeVisible();
    await clientResult.click();
    await expect(page.getByRole("heading", { name: "Cam Fictional" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Client governance summary" })).toBeVisible();
    await expect(page.getByText(/Phone:\s*07000 000001/)).toBeVisible();
    const clientPath = new URL(page.url()).pathname;

    await page.getByRole("link", { name: "Create action" }).click();
    await expect(page.getByRole("heading", { name: "Create improvement action" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Person affected (optional)" })).toHaveValue(/Cam Fictional.*E2E-CLI-0001/);

    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    await search.fill("E2E-STF-0001");
    const staffResult = quickFind.getByRole("option").filter({ hasText: "E2E-STF-0001" });
    await expect(staffResult).toBeVisible();
    await staffResult.click();
    await expect(page.getByRole("heading", { name: "Tay Fictional" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Staff assurance summary" })).toBeVisible();
    await expect(page.getByText("07000 000002", { exact: true })).toBeVisible();

    const timing = await page.evaluate(async () => {
      const started = performance.now();
      const response = await fetch("/api/quick-find?q=E2E-INC-READY");
      const body = await response.json();
      return { duration: performance.now() - started, ok: response.ok, items: body.items as Array<{ kind: string; reference: string }> };
    });
    expect(timing.ok).toBe(true);
    expect(timing.items).toContainEqual(expect.objectContaining({ kind: "INCIDENT", reference: "E2E-INC-READY" }));
    expect(timing.duration).toBeLessThan(5_000);
    testInfo.annotations.push({ type: "quick-find-performance", description: `${Math.round(timing.duration)}ms authenticated response` });

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(clientPath).toMatch(/^\/clients\/[0-9a-f-]+$/);
  });

  test("prevents location and tenant boundary leakage through profiles and Quick Find", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "The same server-side scope is exercised by the desktop boundary test.");
    await signIn(page, E2E_USERS.registeredManager);
    const paths = await page.evaluate(async () => {
      const [clients, staff] = await Promise.all([
        fetch("/api/quick-find?q=E2E-CLI-0001").then((response) => response.json()),
        fetch("/api/quick-find?q=E2E-STF-0001").then((response) => response.json()),
      ]);
      return { client: clients.items[0]?.href as string, staff: staff.items[0]?.href as string };
    });
    expect(paths.client).toMatch(/^\/clients\//);
    expect(paths.staff).toMatch(/^\/workforce\//);

    await page.context().clearCookies();
    await signIn(page, E2E_USERS.locationRestricted);
    expect((await page.goto(paths.client, { waitUntil: "domcontentloaded" }))?.status()).toBe(404);
    expect((await page.goto(paths.staff, { waitUntil: "domcontentloaded" }))?.status()).toBe(404);
    const locationResults = await page.evaluate(async () => (await fetch("/api/quick-find?q=E2E-CLI-0001")).json());
    expect(locationResults.items).toEqual([]);

    await page.context().clearCookies();
    await signIn(page, E2E_USERS.otherTenant);
    expect((await page.goto(paths.client, { waitUntil: "domcontentloaded" }))?.status()).toBe(404);
    const tenantResults = await page.evaluate(async () => (await fetch("/api/quick-find?q=E2E-STF-0001")).json());
    expect(tenantResults.items).toEqual([]);
  });

  test("does not expose another user's Evidence metadata to an upload-only contributor", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "The same server-side permission path is exercised by the desktop test.");
    await signIn(page, E2E_USERS.contributor);
    const result = await page.evaluate(async () => {
      const response = await fetch("/api/quick-find?q=E2E-SRC-001");
      return { status: response.status, body: await response.json() };
    });
    expect(result.status).toBe(200);
    expect(result.body.items).toEqual([]);

    await e2eGoto(page, "/clients");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
