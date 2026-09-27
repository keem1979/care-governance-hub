import { expect, test } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type Setup = {
  incidents: Record<string, { id: string; locationId: string; status: string }>;
  evidenceId: string;
};

test("Incident Assurance preserves investigation, canonical Action, effectiveness and closure boundaries", async ({ page, browser, request }) => {
  test.setTimeout(420_000);
  const setup = await resetAndRead(request);
  const ready = setup.incidents["E2E-INC-READY"], blocked = setup.incidents["E2E-INC-BLOCKED"];
  expect(ready?.status).toBe("IN_REVIEW");
  expect(blocked?.status).toBe("IN_REVIEW");

  await signIn(page, E2E_USERS.registeredManager);
  await page.goto(`/registers/incidents/${ready.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Facts → investigation → Action → effectiveness → assurance" })).toBeVisible();
  await expect(page.locator("#linked-actions summary")).toHaveText("View 1 closed Action");
  await expect(page.getByRole("link", { name: /E2E-ACT-INCIDENT-EFFECTIVE/ })).not.toBeVisible();
  await page.locator("#linked-actions summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: /E2E-ACT-INCIDENT-EFFECTIVE/ })).toBeVisible();
  await expect(page.getByText(/Effectiveness: effective/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Outstanding assurance requirements", exact: true })).toBeVisible();
  await expect(page.getByText("Sufficient appropriate closure Evidence selected")).toBeVisible();

  const genericClosure = await page.evaluate(async (id) => {
    const form = new FormData(); form.set("title", "Fictional incident ready for assurance"); form.set("summary", "A valid fictional Incident summary."); form.set("riskLevel", "HIGH"); form.set("status", "CLOSED");
    const response = await fetch(`/api/registers/incidents/${id}`, { method: "PATCH", body: form });
    return { status: response.status, body: await response.json() };
  }, ready.id);
  expect(genericClosure.status).toBe(400);
  expect(genericClosure.body.error).toMatch(/controlled lifecycle, not the general status field/i);

  const blockedClosure = await incidentDecision(page, blocked.id, setup.evidenceId, "ASSURED_CLOSED", "The Action is still open, so this closure must be rejected.");
  expect(blockedClosure.status).toBe(400);
  expect(blockedClosure.body.error).toMatch(/No unresolved Incident Actions/i);

  const closure = await incidentDecision(page, ready.id, setup.evidenceId, "ASSURED_CLOSED", "The investigation is complete, the central Action is closed with observed effectiveness and the governed closure Evidence is sufficient.");
  expect(closure.status).toBe(200);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Closed · HIGH risk")).toBeVisible();
  await expect(page.getByText("ASSURED CLOSED", { exact: true })).not.toBeVisible();
  const closureHistory = page.locator("details").filter({ hasText: "Incident assurance decisions" });
  await closureHistory.locator("summary").click();
  await expect(closureHistory.getByText("ASSURED CLOSED", { exact: true })).toBeVisible();

  const closedInvestigation = await page.evaluate(async (id) => {
    const form = new FormData(); form.set("intent", "draft");
    const response = await fetch(`/api/registers/incidents/${id}/investigation`, { method: "POST", body: form });
    return { status: response.status, body: await response.json() };
  }, ready.id);
  expect(closedInvestigation.status).toBe(400);
  expect(closedInvestigation.body.error).toMatch(/Reopen the Incident/i);

  const closedNotAssured = await incidentDecision(page, ready.id, null, "NOT_ASSURED", "A closed Incident must first be reopened before a contradictory decision is recorded.");
  expect(closedNotAssured.status).toBe(400);
  expect(closedNotAssured.body.error).toMatch(/Reopen the Incident/i);

  const unauthorisedContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const unauthorised = await unauthorisedContext.newPage();
  await signIn(unauthorised, E2E_USERS.riskOwner);
  const unauthorisedReopening = await incidentDecision(unauthorised, ready.id, null, "REOPENED", "A Quality or Compliance Manager with edit capability must not bypass the provider's High Incident reopening authority.");
  expect(unauthorisedReopening.status).toBe(400);
  expect(unauthorisedReopening.body.error).toMatch(/not authorised to close this level of incident/i);
  await unauthorisedContext.close();

  const reopening = await incidentDecision(page, ready.id, null, "REOPENED", "New information requires the Incident assurance decision to be reviewed without altering the linked Action history.");
  expect(reopening.status).toBe(200);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("In review · HIGH risk")).toBeVisible();
  await page.locator("#linked-actions summary").click();
  await expect(page.getByRole("link", { name: /E2E-ACT-INCIDENT-EFFECTIVE/ })).toBeVisible();
  await expect(page.getByText(/Effectiveness: effective/i)).toBeVisible();

  const origin = new URL(page.url()).origin;
  const restrictedContext = await browser.newContext({ baseURL: origin });
  const restricted = await restrictedContext.newPage();
  await signIn(restricted, E2E_USERS.locationRestricted);
  await restricted.goto(`/registers/incidents/${ready.id}`, { waitUntil: "domcontentloaded" });
  await expect(restricted.getByText(/page could not be found/i)).toBeVisible();
  expect((await incidentDecision(restricted, ready.id, setup.evidenceId, "NOT_ASSURED", "This out-of-location decision must not be accepted.")).status).toBe(404);
  await restrictedContext.close();

  const otherContext = await browser.newContext({ baseURL: origin });
  const other = await otherContext.newPage();
  await signIn(other, E2E_USERS.otherTenant);
  expect((await incidentDecision(other, ready.id, setup.evidenceId, "NOT_ASSURED", "This cross-tenant decision must not be accepted.")).status).toBe(404);
  await otherContext.close();
});

async function resetAndRead(request: import("@playwright/test").APIRequestContext) {
  const reset = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(reset.status()).toBe(200);
  const response = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(response.status()).toBe(200);
  return await response.json() as Setup;
}

async function incidentDecision(page: import("@playwright/test").Page, id: string, evidenceId: string | null, decision: string, rationale: string) {
  return page.evaluate(async ({ id, evidenceId, decision, rationale }) => {
    const form = new FormData(); form.set("decision", decision); form.set("rationale", rationale); if (evidenceId) form.append("evidenceIds", evidenceId);
    const response = await fetch(`/api/registers/incidents/${id}/assurance`, { method: "POST", body: form });
    return { status: response.status, body: await response.json() };
  }, { id, evidenceId, decision, rationale });
}
