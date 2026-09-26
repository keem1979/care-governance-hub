import { expect, test } from "@playwright/test";
import { e2eGoto, signIn } from "./auth";
import { E2E_USERS } from "./fixtures";

test("minimum Incident, Complaint and Safeguarding captures save canonical unassessed records", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, E2E_USERS.riskOwner);
  const unique = Date.now();

  await e2eGoto(page, "/registers/incidents/new");
  await expect(page.getByRole("heading", { name: "Record incident" })).toBeVisible();
  await expect(page.locator('select[name="field_harmLevel"]')).toHaveValue("Unknown / evidence required");
  await expect(page.locator('[name="riskLevel"]')).toHaveCount(0);
  await expect(page.locator('[name="evidenceIds"]')).toHaveCount(0);
  await page.getByRole("textbox", { name: "What happened? *" }).fill(`Fictional E2E Incident first capture ${unique}.`);
  await page.getByRole("combobox", { name: "Incident type *" }).selectOption("Care delivery");
  await page.getByRole("button", { name: "Save incident" }).click();
  await expect(page).toHaveURL(/\/registers\/incidents\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Risk unassessed", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Evidence", exact: true })).toBeVisible();

  await e2eGoto(page, "/registers/complaints/new");
  await expect(page.locator('select[name="field_immediateSafetyConcern"]')).toHaveValue("Unknown / evidence required");
  await page.getByRole("textbox", { name: "What was reported? *" }).fill(`Fictional E2E Complaint first capture ${unique}.`);
  await page.getByRole("button", { name: "Save complaint" }).click();
  await expect(page).toHaveURL(/\/registers\/complaints\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Risk unassessed", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Evidence", exact: true })).toBeVisible();

  await e2eGoto(page, "/registers/safeguarding/new");
  await expect(page.locator('select[name="field_safetyPosition"]')).toHaveValue("Unknown / evidence required");
  await page.getByRole("textbox", { name: "What is the safeguarding concern? *" }).fill(`Fictional E2E Safeguarding first capture ${unique}.`);
  await page.getByRole("combobox", { name: "Person/client this concerns *" }).fill("Cam Fictional");
  await page.getByRole("option", { name: /Cam Fictional.*E2E-CLI-0001/ }).click();
  await page.getByRole("button", { name: "Save safeguarding concern" }).click();
  await expect(page).toHaveURL(/\/registers\/safeguarding\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Risk unassessed", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Cam Fictional", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Evidence", exact: true })).toBeVisible();
});

test("Safeguarding first save requires an authorised Client result", async ({ page }) => {
  await signIn(page, E2E_USERS.riskOwner);
  await e2eGoto(page, "/registers/safeguarding/new");
  await page.getByRole("textbox", { name: "What is the safeguarding concern? *" }).fill("Fictional concern without a selected Client.");
  await page.getByRole("combobox", { name: "Person/client this concerns *" }).fill("Someone not in the authorised directory");
  await page.getByRole("button", { name: "Save safeguarding concern" }).click();
  await expect(page.locator('form [role="alert"]')).toHaveText("Choose the client this safeguarding concern relates to.");
  await expect(page).toHaveURL(/\/registers\/safeguarding\/new$/);
});
