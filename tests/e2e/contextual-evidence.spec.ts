import { expect, test } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN } from "./fixtures";

test("Incident Evidence uploads and reuses authorised Evidence in context", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await signIn(page);
  const fixture = await page.evaluate(async (token) => {
    const response = await fetch("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": token } });
    return response.json() as Promise<{ incidents: Record<string, { id: string }> }>;
  }, E2E_SETUP_TOKEN);
  const id = fixture.incidents["E2E-INC-BLOCKED"].id;
  await page.goto(`/registers/incidents/${id}`, { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Add Evidence", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add Evidence" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Upload file or photo" }).click();
  await expect(dialog.getByLabel("Choose file or photo")).toBeVisible();
  await expect(dialog.getByLabel("Title")).toHaveCount(0);
  await expect(dialog.getByLabel("Evidence category")).toHaveCount(0);
  const upload = page.waitForResponse(response => response.url().endsWith("/api/evidence/contextual") && response.request().method() === "POST");
  await dialog.getByLabel("Choose file or photo").setInputFiles({ name: "e2e-contextual-photo.png", mimeType: "image/png", buffer: Buffer.from("fictional image bytes") });
  const uploaded = await upload;
  expect(uploaded.status()).toBe(201);
  const body = await uploaded.json() as { evidenceId: string };
  expect(body.evidenceId).toBeTruthy();
  await expect(dialog.getByRole("heading", { name: "Evidence added" })).toBeVisible();
  await expect(dialog.getByText("Any review or assurance decision remains yours.")).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Add Evidence", exact: true }).click();
  await dialog.getByRole("button", { name: "Use existing Evidence" }).click();
  await dialog.getByLabel("Search Evidence").fill("E2E verified governance source");
  const search = page.waitForResponse(response => response.url().includes("/api/evidence/authorised-options") && response.request().method() === "GET");
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  expect((await search).status()).toBe(200);
  await dialog.getByRole("button", { name: /E2E verified governance source/ }).first().click();
  await expect(dialog.getByRole("heading", { name: "Preview" })).toBeVisible();
  const link = page.waitForResponse(response => response.url().endsWith("/api/evidence/contextual") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Link Evidence" }).click();
  expect((await link).status()).toBe(200);
  await expect(dialog.getByRole("heading", { name: "Evidence added" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("contextual-evidence-done.png"), fullPage: true });
});
