import { expect, test } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

test("Incident investigation and assurance remain usable on mobile", async ({ page, request }) => {
  test.setTimeout(240_000);
  const setupResponse = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(setupResponse.status()).toBe(200);
  const setup = await (await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).json() as { incidents: Record<string, { id: string }> };
  await signIn(page, E2E_USERS.registeredManager);
  await page.goto(`/registers/incidents/${setup.incidents["E2E-INC-READY"].id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Facts → investigation → Action → effectiveness → assurance" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const close = page.getByRole("button", { name: "Authorise Incident closure" });
  await expect(close).toBeVisible();
  expect((await close.boundingBox())?.height).toBeGreaterThanOrEqual(40);
});
