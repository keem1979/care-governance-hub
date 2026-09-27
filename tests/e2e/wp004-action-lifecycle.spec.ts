import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { e2eGoto, e2eReload, signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type Setup = {
  actions: Record<string, { id: string; locationId: string }>;
  evidenceId: string;
};

test("an Action owner submits compact completed work while assurance decisions stay separate", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(360_000);
  const reset = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(reset.status()).toBe(200);
  const fixtureResponse = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(fixtureResponse.status()).toBe(200);
  const fixture = await fixtureResponse.json() as Setup;
  const locationId = fixture.actions["E2E-ACT-ASSURANCE-HIGH"].locationId;
  expect(fixture.evidenceId).toBeTruthy();

  await signIn(page, E2E_USERS.riskOwner);
  const id = await createFictionalAction(page, locationId, Date.now());
  const origin = new URL(page.url()).origin;
  await e2eGoto(page, `/actions/${id}`);
  const completion = page.locator("#current-work").locator("section").filter({ has: page.getByRole("heading", { name: "Submit completed work for verification" }) }).first();
  await expect(completion.getByRole("button", { name: "Submit for verification" })).toBeVisible();
  await expect(completion.getByRole("textbox", { name: "What did you do?" })).toBeVisible();
  await expect(completion.getByRole("combobox", { name: "Evidence supporting completion" })).toBeVisible();
  await expect(page.locator("#current-work").getByRole("button", { name: "Save progress update" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  // Direct requests cannot claim completion without an account and governed Evidence.
  expect(await submitCompletionRequest(page, id, "", fixture.evidenceId)).toBe(400);
  expect(await submitCompletionRequest(page, id, "Fictional corrective work was carried out.", "")).toBe(400);
  expect((await readAction(id)).completionDate).toBeNull();

  const account = "The fictional medicines control was implemented and the handover checklist updated.";
  await completion.getByRole("textbox", { name: "What did you do?" }).fill(account);
  await completion.getByRole("combobox", { name: "Evidence supporting completion" }).selectOption(fixture.evidenceId);
  const submitted = page.waitForResponse(response => response.url().endsWith(`/api/actions/${id}/updates`) && response.request().method() === "POST");
  await completion.getByRole("button", { name: "Submit for verification" }).click();
  expect((await submitted).status()).toBe(200);
  await expect(page.getByRole("region", { name: "Action lifecycle" })).toContainText("Completed");
  await expect(page.getByText("Manager verification required", { exact: true })).toBeVisible();
  await expect(page.getByText(account, { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("wp004-completion-submitted.png"), fullPage: true });

  const afterCompletion = await readAction(id);
  expect(afterCompletion.progressPercent).toBe(100);
  expect(afterCompletion.completionDate).not.toBeNull();
  expect(afterCompletion.lifecycleStatus).toBe("AWAITING_VERIFICATION");
  expect(afterCompletion.verifiedById).toBeNull();
  expect(afterCompletion.verificationDate).toBeNull();
  expect(afterCompletion.closedAt).toBeNull();
  expect(afterCompletion.completionEvidenceCount).toBe(1);

  const managerContext = await browser.newContext({ baseURL: origin, viewport: page.viewportSize() ?? undefined, isMobile: testInfo.project.name === "mobile", hasTouch: testInfo.project.name === "mobile" });
  const manager = await managerContext.newPage();
  try {
    await signIn(manager, E2E_USERS.registeredManager);
    await e2eGoto(manager, `/actions/${id}/assurance#verification`);
    const verification = manager.locator("#verification");
    await expect(verification.getByRole("combobox", { name: "Verification outcome" })).toHaveValue("");
    expect(await manager.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await prematureClosureRequest(manager, id, fixture.evidenceId)).toBe(409);
    expect((await readAction(id)).closedAt).toBeNull();

    // High-priority root-cause work is a later governance step, not part of
    // the owner's compact completion form.
    expect(await completeRootCauseReview(manager, id)).toBe(200);

    // The signed-in manager must make an explicit verification decision.
    await verification.getByRole("combobox", { name: "Verification outcome" }).selectOption("VERIFIED");
    await verification.getByRole("listbox", { name: "Evidence checked" }).selectOption([fixture.evidenceId]);
    await verification.getByRole("textbox", { name: "Result against the predefined success measure" }).fill("Implementation was checked against the agreed checklist; sustained effect still needs review.");
    await verification.getByRole("textbox", { name: "Verification rationale" }).fill("The completion account and governed Evidence support the work being carried out.");
    const verified = manager.waitForResponse(response => response.url().endsWith(`/api/actions/${id}/assurance/verification`) && response.request().method() === "POST");
    await verification.getByRole("button", { name: "Record verification" }).click();
    expect((await verified).status()).toBe(200);
    await e2eGoto(manager, `/actions/${id}/assurance#verification`);
    await e2eReload(manager);
    await expect(verification.getByText("Current verification decision")).toBeVisible();
    await manager.screenshot({ path: testInfo.outputPath("wp004-verification-recorded.png"), fullPage: true });
    await e2eGoto(manager, `/actions/${id}/assurance#effectiveness`);
    const effectiveness = manager.locator("#effectiveness");
    await expect(effectiveness.getByRole("combobox", { name: "Effectiveness outcome" })).toHaveValue("");
    await expect(effectiveness.getByRole("combobox", { name: "Recurrence identified?" })).toHaveValue("");
    expect(await manager.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await effectivenessWithoutRecurrenceRequest(manager, id, fixture.evidenceId)).toBe(400);
    await effectiveness.getByRole("combobox", { name: "Effectiveness outcome" }).selectOption("PARTIALLY_EFFECTIVE");
    await effectiveness.getByRole("listbox", { name: "Evidence of the observed result" }).selectOption([fixture.evidenceId]);
    await effectiveness.getByRole("combobox", { name: "Recurrence identified?" }).selectOption("false");
    await effectiveness.getByRole("textbox", { name: "Observed result" }).fill("The first follow-up sample shows partial uptake of the checklist.");
    await effectiveness.getByRole("textbox", { name: "Management decision" }).fill("Continue the Action and review a later sample before closure.");
    const reviewed = manager.waitForResponse(response => response.url().endsWith(`/api/actions/${id}/assurance/effectiveness`) && response.request().method() === "POST");
    await effectiveness.getByRole("button", { name: "Record effectiveness review" }).click();
    expect((await reviewed).status()).toBe(200);
    await e2eGoto(manager, `/actions/${id}/assurance#effectiveness`);
    await e2eReload(manager);
    await expect(effectiveness).toContainText("The first follow-up sample shows partial uptake of the checklist.");
    await manager.screenshot({ path: testInfo.outputPath("wp004-effectiveness-reviewed.png"), fullPage: true });
    expect((await readAction(id)).lifecycleStatus).toBe("AWAITING_EFFECTIVENESS");
    expect((await readAction(id)).closedAt).toBeNull();
  } finally {
    await managerContext.close();
  }
});

async function createFictionalAction(page: Page, locationId: string, runKey: number): Promise<string> {
  const result = await page.evaluate(async ({ locationId, runKey, ownerName, managerName }) => {
    async function option(kind: string, name: string) {
      const response = await fetch(`/api/actions/authorised-options?kind=${kind}&q=${encodeURIComponent(name)}&locationId=${encodeURIComponent(locationId)}`);
      const body = await response.json() as { items?: { id: string; name: string }[] };
      return { status: response.status, id: body.items?.find(item => item.name === name)?.id ?? "" };
    }
    const owner = await option("OWNER", ownerName), oversight = await option("OVERSIGHT", managerName);
    if (owner.status !== 200 || oversight.status !== 200 || !owner.id || !oversight.id) return { status: 0, id: "", error: "Fictional authorised owner lookup failed." };
    const dueDate = new Date(); dueDate.setUTCDate(dueDate.getUTCDate() + 30);
    const form = new FormData();
    form.set("title", `WP004 fictional compact completion ${runKey}`);
    form.set("reference", `E2E-ACT-WP004-${runKey}`);
    form.set("description", "Implement a fictional medicines handover checklist for test purposes.");
    form.set("expectedOutcome", "The fictional handover checklist is used consistently.");
    form.set("successMeasure", "The next sample finds the fictional checklist in use.");
    form.set("ownerId", owner.id);
    form.set("oversightOwnerId", oversight.id);
    form.set("dueDate", dueDate.toISOString().slice(0, 10));
    form.set("locationId", locationId);
    form.set("category", "Governance");
    form.set("priority", "HIGH");
    form.set("source", "MANUAL:");
    form.set("issueKey", `wp004-fictional-${runKey}`);
    let response = await fetch("/api/actions", { method: "POST", body: form });
    let body = await response.json() as { id?: string; error?: string; code?: string; matches?: { actionId: string; title: string; issueKey: string | null }[] };
    if (response.status === 409 && body.code === "POSSIBLE_MATCH") {
      const suggested = body.matches?.[0];
      if (!suggested || body.matches?.some(match => match.title === form.get("title") || match.issueKey === form.get("issueKey"))) {
        return { status: response.status, id: "", error: "The fictional Action matched the same test run; refusing to reject it." };
      }
      // The server requires an explicit decision when unrelated fictional fixtures look similar.
      form.set("matchDecision", `REJECT:${suggested.actionId}`);
      response = await fetch("/api/actions", { method: "POST", body: form });
      body = await response.json() as typeof body;
    }
    return { status: response.status, id: body.id ?? "", error: body.error ?? "" };
  }, { locationId, runKey, ownerName: E2E_USERS.riskOwner.name, managerName: E2E_USERS.registeredManager.name });
  expect(result, result.error).toMatchObject({ status: 201 });
  expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
  return result.id;
}

async function submitCompletionRequest(page: Page, id: string, note: string, evidenceId: string): Promise<number> {
  return page.evaluate(async ({ id, note, evidenceId }) => {
    const form = new FormData();
    form.set("intent", "complete");
    form.set("note", note);
    if (evidenceId) form.set("evidenceId", evidenceId);
    const response = await fetch(`/api/actions/${id}/updates`, { method: "POST", body: form });
    return response.status;
  }, { id, note, evidenceId });
}

async function prematureClosureRequest(page: Page, id: string, evidenceId: string): Promise<number> {
  return page.evaluate(async ({ id, evidenceId }) => {
    const form = new FormData();
    form.set("intent", "close");
    form.set("rationale", "Completion was submitted but independent assurance is still required.");
    form.append("evidenceIds", evidenceId);
    const response = await fetch(`/api/actions/${id}/assurance/closure`, { method: "POST", body: form });
    return response.status;
  }, { id, evidenceId });
}

async function completeRootCauseReview(page: Page, id: string): Promise<number> {
  return page.evaluate(async id => {
    const form = new FormData();
    form.set("method", "FIVE_WHYS");
    form.set("problemStatement", "The fictional handover checklist was not applied consistently.");
    form.set("immediateCauses", "The prompt was missed.");
    form.set("lessons", "The handover prompt needs a recorded check at each shift.");
    form.set("preventiveControls", "A manager will review the next sample for use of the prompt.");
    const response = await fetch(`/api/actions/${id}/assurance/root-cause`, { method: "POST", body: form });
    return response.status;
  }, id);
}

async function effectivenessWithoutRecurrenceRequest(page: Page, id: string, evidenceId: string): Promise<number> {
  return page.evaluate(async ({ id, evidenceId }) => {
    const form = new FormData();
    form.set("outcome", "PARTIALLY_EFFECTIVE");
    form.set("reviewDate", new Date().toISOString().slice(0, 10));
    form.set("observedResult", "The follow-up sample shows only partial uptake.");
    form.set("decision", "Continue the Action and review another sample.");
    form.append("evidenceIds", evidenceId);
    const response = await fetch(`/api/actions/${id}/assurance/effectiveness`, { method: "POST", body: form });
    return response.status;
  }, { id, evidenceId });
}

async function readAction(id: string) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (url.hostname !== "127.0.0.1" || !(url.pathname === "/care_governance_hub_test" || url.pathname.startsWith("/qcgms_e2e_"))) {
    throw new Error("WP-004 browser integrity check requires a disposable local database.");
  }
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const result = await db.query('SELECT a."progressPercent",a."completionDate",a."lifecycleStatus",a."verifiedById",a."verificationDate",a."closedAt",(SELECT count(*)::int FROM "ActionEvidence" e WHERE e."actionId"=a.id AND e.role=\'COMPLETION\' AND e."retiredAt" IS NULL) AS "completionEvidenceCount" FROM "Action" a WHERE a.id=$1', [id]);
    expect(result.rows).toHaveLength(1);
    return result.rows[0] as { progressPercent: number; completionDate: Date | null; lifecycleStatus: string; verifiedById: string | null; verificationDate: Date | null; closedAt: Date | null; completionEvidenceCount: number };
  } finally {
    await db.end();
  }
}
