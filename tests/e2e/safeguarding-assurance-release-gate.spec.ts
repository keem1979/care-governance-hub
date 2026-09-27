import { expect, test } from "@playwright/test";
import { e2eGoto, e2eReload, signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type Setup = {
  safeguarding: Record<string, { id: string; locationId: string; status: string }>;
  evidenceId: string;
};

test("Safeguarding Assurance preserves safety, Action, effectiveness and closure boundaries", async ({ page, browser, request }) => {
  test.setTimeout(480_000);
  const reset = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(reset.status()).toBe(200);
  const setup = await (await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } })).json() as Setup;
  const ready = setup.safeguarding["E2E-SG-READY"];
  const blocked = setup.safeguarding["E2E-SG-BLOCKED"];
  const low = setup.safeguarding["E2E-SG-LOW"];
  const critical = setup.safeguarding["E2E-SG-CRITICAL"];
  const overdue = setup.safeguarding["E2E-SG-OVERDUE"];

  await signIn(page, E2E_USERS.registeredManager);
  await e2eGoto(page, `/registers/safeguarding/${ready.id}`);
  await expect(page.getByRole("heading", { name: "Concern → safety → referral → enquiry → assurance" })).toBeVisible();
  await expect(page.locator("#linked-actions summary")).toHaveText("View 1 closed Action");
  await expect(page.getByRole("link", { name: /E2E-ACT-SAFEGUARDING-EFFECTIVE/ })).not.toBeVisible();
  await page.locator("#linked-actions summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: /E2E-ACT-SAFEGUARDING-EFFECTIVE/ })).toBeVisible();
  await expect(page.getByText(/Effectiveness: effective/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Print assurance record" })).toBeVisible();

  const generic = await page.evaluate(async id => {
    const form = new FormData();
    form.set("title", "Fictional safeguarding ready");
    form.set("summary", "Material concern.");
    form.set("riskLevel", "HIGH");
    form.set("status", "CLOSED");
    const response = await fetch(`/api/registers/safeguarding/${id}`, { method: "PATCH", body: form });
    return { status: response.status, body: await response.json() };
  }, ready.id);
  expect(generic.status).toBe(400);
  expect(generic.body.error).toMatch(/controlled lifecycle, not the general status field/i);

  const blockedDecision = await decision(page, blocked.id, setup.evidenceId, "ASSURED_CLOSED", "Open improvement means assurance cannot yet be provided.");
  expect(blockedDecision.status).toBe(400);
  expect(blockedDecision.body.error).toMatch(/No safeguarding Actions remain unresolved/i);
  await page.getByRole("link", { name: "Create linked Action" }).click();
  await expect(page.getByLabel("What must be achieved?")).toHaveValue(/E2E-SG-READY/);
  await page.goBack({ waitUntil: "domcontentloaded" });
  expect((await decision(page, ready.id, setup.evidenceId, "ASSURED_CLOSED", "Safety, enquiry, Evidence, central Action and effectiveness provide sufficient management assurance.")).status).toBe(200);
  await e2eReload(page);
  await expect(page.getByText("Closed · HIGH risk")).toBeVisible();

  const protectedUpdate = await page.evaluate(async id => {
    const form = new FormData();
    form.set("status", "TRIAGED");
    form.set("safetyPosition", "SAFE_NOW");
    form.set("referralDecision", "NOT_REQUIRED");
    form.set("investigatorId", id);
    const response = await fetch(`/api/registers/safeguarding/${id}/case`, { method: "POST", body: form });
    return { status: response.status, body: await response.json() };
  }, ready.id);
  expect(protectedUpdate.status).toBe(400);
  expect(protectedUpdate.body.error).toMatch(/Reopen/i);

  await e2eGoto(page, `/registers/safeguarding/${low.id}`);
  expect((await decision(page, low.id, null, "ASSURED_CLOSED", "This low-complexity concern has a complete proportionate record and accountable rationale.")).status).toBe(200);
  expect((await decision(page, low.id, setup.evidenceId, "REOPENED", "Material new information requires another review.", "A new professional account was received after closure.")).status).toBe(200);
  await e2eReload(page);
  await expect(page.getByText("Reopened", { exact: true })).not.toBeVisible();
  const reopeningHistory = page.locator("details").filter({ hasText: "Safeguarding assurance decisions" });
  await reopeningHistory.locator("summary").click();
  await expect(reopeningHistory.getByText("Reopened", { exact: true })).toBeVisible();

  await e2eGoto(page, `/registers/safeguarding/${critical.id}`);
  const self = await decision(page, critical.id, setup.evidenceId, "ASSURED_CLOSED", "The same manager must not self-close Critical safeguarding.");
  expect(self.status).toBe(400);
  expect(self.body.error).toMatch(/did not create or investigate/i);

  const origin = new URL(page.url()).origin;
  const ownerContext = await browser.newContext({ baseURL: origin });
  const owner = await ownerContext.newPage();
  await signIn(owner, E2E_USERS.organisationOwner);
  expect((await decision(owner, critical.id, setup.evidenceId, "ASSURED_CLOSED", "Independent senior review confirms sufficient safeguarding assurance and closure authority.")).status).toBe(200);
  await ownerContext.close();

  await e2eGoto(page, "/my-work");
  await expect(page.getByText("E2E-SG-OVERDUE", { exact: true })).toBeVisible();
  await expect(page.getByText(/Complete the proportionate safeguarding enquiry|external/i).first()).toBeVisible();
  await e2eGoto(page, "/dashboard");
  await expect(page.getByText("Safeguarding external responses overdue")).toBeVisible();
  await e2eGoto(page, "/calendar");
  await expect(page.getByText(/E2E-SG-OVERDUE/).first()).toBeVisible();

  const restrictedContext = await browser.newContext({ baseURL: origin });
  const restricted = await restrictedContext.newPage();
  await signIn(restricted, E2E_USERS.locationRestricted);
  expect((await decision(restricted, overdue.id, setup.evidenceId, "NOT_ASSURED", "Out-of-location decision must not be accepted.")).status).toBe(404);
  await restrictedContext.close();

  const otherContext = await browser.newContext({ baseURL: origin });
  const other = await otherContext.newPage();
  await signIn(other, E2E_USERS.otherTenant);
  expect((await decision(other, overdue.id, setup.evidenceId, "NOT_ASSURED", "Cross-tenant decision must not be accepted.")).status).toBe(404);
  await otherContext.close();
});

async function decision(page: import("@playwright/test").Page, id: string, evidenceId: string | null, decisionValue: string, rationale: string, newInformation = "") {
  return page.evaluate(async input => {
    const form = new FormData();
    form.set("decision", input.decisionValue);
    form.set("rationale", input.rationale);
    form.set("newInformation", input.newInformation);
    if (input.evidenceId) form.append("evidenceIds", input.evidenceId);
    const response = await fetch(`/api/registers/safeguarding/${input.id}/assurance`, { method: "POST", body: form });
    return { status: response.status, body: await response.json() };
  }, { id, evidenceId, decisionValue, rationale, newInformation });
}
