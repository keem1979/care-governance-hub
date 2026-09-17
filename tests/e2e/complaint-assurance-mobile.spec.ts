import { expect, test } from "@playwright/test";
import { e2eGoto, signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

test("Complaint investigation, chronology and assurance remain usable on mobile", async ({ page, request }) => {
  test.setTimeout(300_000);
  expect((await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).status()).toBe(200);
  const setup = await (await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).json() as { complaints: Record<string, { id: string }> };
  await signIn(page, E2E_USERS.registeredManager);
  await e2eGoto(page, `/registers/complaints/${setup.complaints["E2E-CMP-READY"].id}`);
  await expect(page.getByRole("heading", { name: "Received → acknowledged → investigated → response → assurance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record material communication" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const assurance = page.getByRole("button", { name: "Authorise Complaint closure" });
  await expect(assurance).toBeVisible();
  expect((await assurance.boundingBox())?.height).toBeGreaterThanOrEqual(40);
});
