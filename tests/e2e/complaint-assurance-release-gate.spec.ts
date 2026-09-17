import { expect, test } from "@playwright/test";
import { e2eGoto, e2eReload, signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type Setup = {
  complaints: Record<string, { id: string; locationId: string; status: string }>;
  evidenceId: string;
};

test("Complaints Assurance keeps response, Action, effectiveness and closure as separate governed decisions", async ({ page, browser, request }) => {
  test.setTimeout(480_000);
  const setup = await resetAndRead(request);
  const low = setup.complaints["E2E-CMP-LOW"];
  const ready = setup.complaints["E2E-CMP-READY"];
  const blocked = setup.complaints["E2E-CMP-BLOCKED"];
  const critical = setup.complaints["E2E-CMP-CRITICAL"];
  const overdue = setup.complaints["E2E-CMP-OVERDUE"];
  expect(low?.status).toBe("IN_REVIEW");
  expect(overdue?.status).toBe("OPEN");

  await signIn(page, E2E_USERS.registeredManager);
  await e2eGoto(page, `/registers/complaints/${ready.id}`);
  await expect(page.getByRole("heading", { name: "Received → acknowledged → investigated → response → assurance" })).toBeVisible();
  await expect(page.locator("#linked-actions summary")).toHaveText("View 1 closed Action");
  await expect(page.getByRole("link", { name: /E2E-ACT-COMPLAINT-EFFECTIVE/ })).not.toBeVisible();
  await page.locator("#linked-actions summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: /E2E-ACT-COMPLAINT-EFFECTIVE/ })).toBeVisible();
  await expect(page.getByText(/Effectiveness: effective/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Print assurance record" })).toBeVisible();

  const genericClosure = await page.evaluate(async (id) => {
    const form = new FormData();
    form.set("title", "Fictional Complaint ready for assurance");
    form.set("summary", "A material fictional Complaint.");
    form.set("riskLevel", "HIGH");
    form.set("status", "CLOSED");
    const response = await fetch(`/api/registers/complaints/${id}`, { method: "PATCH", body: form });
    return { status: response.status, body: await response.json() };
  }, ready.id);
  expect(genericClosure.status).toBe(400);
  expect(genericClosure.body.error).toMatch(/Management Assurance Test/i);

  const blockedClosure = await complaintDecision(page, blocked.id, setup.evidenceId, "ASSURED_CLOSED", "The unresolved central Action means the Complaint cannot yet be assured.");
  expect(blockedClosure.status).toBe(400);
  expect(blockedClosure.body.error).toMatch(/No unresolved Complaint Actions/i);

  const actionHandoff = page.getByRole("link", { name: "Create linked Action" });
  await actionHandoff.click();
  await expect(page.getByText(/creates one central Action linked to the Complaint/i)).toBeVisible();
  await expect(page.getByLabel("What must be achieved?")).toHaveValue(/E2E-CMP-READY/);
  await page.goBack({ waitUntil: "domcontentloaded" });

  const highClosure = await complaintDecision(page, ready.id, setup.evidenceId, "ASSURED_CLOSED", "The investigation, response, central Action, verification, effectiveness and closure Evidence provide sufficient assurance.");
  expect(highClosure.status).toBe(200);
  await e2eReload(page);
  await expect(page.getByText("Closed · HIGH risk")).toBeVisible();
  await expect(page.getByText("ASSURED CLOSED", { exact: true })).not.toBeVisible();
  const closureHistory = page.locator("details").filter({ hasText: "Complaint assurance decisions" });
  await closureHistory.locator("summary").click();
  await expect(closureHistory.getByText("ASSURED CLOSED", { exact: true })).toBeVisible();
  await page.locator("#linked-actions summary").click();
  await expect(page.getByRole("link", { name: /E2E-ACT-COMPLAINT-EFFECTIVE/ })).toBeVisible();

  const closedInvestigation = await page.evaluate(async (id) => {
    const form = new FormData(); form.set("intent", "draft");
    const response = await fetch(`/api/registers/complaints/${id}/investigation`, { method: "POST", body: form });
    return { status: response.status, body: await response.json() };
  }, ready.id);
  expect(closedInvestigation.status).toBe(400);
  expect(closedInvestigation.body.error).toMatch(/Reopen the Complaint/i);

  await e2eGoto(page, `/registers/complaints/${low.id}`);
  const proportionalClosure = await complaintDecision(page, low.id, null, "ASSURED_CLOSED", "This low-complexity Complaint has a complete proportionate record and an accountable closure rationale.");
  expect(proportionalClosure.status).toBe(200);
  const reopening = await complaintDecision(page, low.id, setup.evidenceId, "REOPENED", "New correspondence requires the original conclusion to be reviewed.", "The complainant supplied material new information after the final response.");
  expect(reopening.status).toBe(200);
  await e2eReload(page);
  await expect(page.getByText("REOPENED", { exact: true })).not.toBeVisible();
  const reopeningHistory = page.locator("details").filter({ hasText: "Complaint assurance decisions" });
  await reopeningHistory.locator("summary").click();
  await expect(reopeningHistory.getByText("REOPENED", { exact: true })).toBeVisible();
  await expect(reopeningHistory.getByText(/The complainant supplied material new information after the final response/i)).toBeVisible();

  await e2eGoto(page, `/registers/complaints/${critical.id}`);
  const selfApproval = await complaintDecision(page, critical.id, setup.evidenceId, "ASSURED_CLOSED", "A Critical Complaint must reject closure by the same manager who created and investigated it.");
  expect(selfApproval.status).toBe(400);
  expect(selfApproval.body.error).toMatch(/requires an authorised closer who did not create or investigate/i);

  const origin = new URL(page.url()).origin;
  const ownerContext = await browser.newContext({ baseURL: origin });
  const owner = await ownerContext.newPage();
  await signIn(owner, E2E_USERS.organisationOwner);
  expect((await complaintDecision(owner, critical.id, setup.evidenceId, "ASSURED_CLOSED", "Independent senior review confirms the Critical Complaint record is complete and the closure Evidence is sufficient.")).status).toBe(200);
  await ownerContext.close();

  await e2eGoto(page, "/my-work");
  await expect(page.getByText("E2E-CMP-OVERDUE", { exact: true })).toBeVisible();
  await expect(page.getByText(/Acknowledge the Complaint/i)).toBeVisible();
  await e2eGoto(page, "/dashboard");
  await expect(page.getByText("Complaint acknowledgements overdue")).toBeVisible();
  await expect(page.getByText("Complaint responses overdue")).toBeVisible();
  await e2eGoto(page, "/calendar");
  await expect(page.getByText(/E2E-CMP-OVERDUE/).first()).toBeVisible();

  const restrictedContext = await browser.newContext({ baseURL: origin });
  const restricted = await restrictedContext.newPage();
  await signIn(restricted, E2E_USERS.locationRestricted);
  await e2eGoto(restricted, `/registers/complaints/${overdue.id}`);
  await expect(restricted.getByText(/page could not be found/i)).toBeVisible();
  expect((await complaintDecision(restricted, overdue.id, setup.evidenceId, "NOT_ASSURED", "This out-of-location decision must never be accepted.")).status).toBe(404);
  await restrictedContext.close();

  const otherContext = await browser.newContext({ baseURL: origin });
  const other = await otherContext.newPage();
  await signIn(other, E2E_USERS.otherTenant);
  expect((await complaintDecision(other, overdue.id, setup.evidenceId, "NOT_ASSURED", "This cross-tenant decision must never be accepted.")).status).toBe(404);
  await otherContext.close();
});

async function resetAndRead(request: import("@playwright/test").APIRequestContext) {
  const reset = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(reset.status()).toBe(200);
  const response = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(response.status()).toBe(200);
  return await response.json() as Setup;
}

async function complaintDecision(page: import("@playwright/test").Page, id: string, evidenceId: string | null, decision: string, rationale: string, newInformation = "") {
  return page.evaluate(async ({ id, evidenceId, decision, rationale, newInformation }) => {
    const form = new FormData();
    form.set("decision", decision);
    form.set("rationale", rationale);
    form.set("newInformation", newInformation);
    if (evidenceId) form.append("evidenceIds", evidenceId);
    const response = await fetch(`/api/registers/complaints/${id}/assurance`, { method: "POST", body: form });
    return { status: response.status, body: await response.json() };
  }, { id, evidenceId, decision, rationale, newInformation });
}
