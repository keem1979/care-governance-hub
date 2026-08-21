import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type Setup = {
  risks: Record<string, { id: string; locationId: string; status: string; residualScore: number }>;
  actions: Record<string, { id: string; locationId: string; status: string }>;
  evidenceId: string;
  correctedEvidenceId: string;
};

test("role-aware Action Evidence preserves completion, verification, effectiveness and closure boundaries", async ({ page, browser, request }) => {
  test.setTimeout(480_000);
  const setup = await resetAndRead(request);
  const high = setup.actions["E2E-ACT-ASSURANCE-HIGH"], ineffective = setup.actions["E2E-ACT-ASSURANCE-INEFFECTIVE"], low = setup.actions["E2E-ACT-ASSURANCE-LOW"];
  expect(high?.id).toBeTruthy(); expect(ineffective?.id).toBeTruthy(); expect(low?.id).toBeTruthy();

  // The delivery owner cannot self-verify the High Action, even through a direct request.
  await signIn(page, E2E_USERS.riskOwner);
  await page.goto(`/actions/${high.id}/assurance`, { waitUntil: "domcontentloaded" });
  const signedInOwnerId = await page.locator('input[name="verifierId"]').inputValue();
  const selfVerification = await verificationRequest(page, high.id, setup.evidenceId, signedInOwnerId);
  expect(selfVerification.status).toBe(400);
  expect(selfVerification.body.error).toMatch(/other than the action owner/i);

  const origin = new URL(page.url()).origin;
  const rmContext = await browser.newContext({ baseURL: origin });
  const rm = await rmContext.newPage();
  await signIn(rm, E2E_USERS.registeredManager);
  await rm.goto(`/actions/${high.id}/assurance`, { waitUntil: "domcontentloaded" });
  await expect(rm.getByRole("heading", { name: "Role-aware Evidence" })).toBeVisible();
  await expect(rm.getByText("Completion", { exact: true }).first()).toBeVisible();
  const evidenceSection = section(rm, "3. Role-aware Evidence");
  await evidenceSection.getByRole("button", { name: "Search" }).click();
  await expect(evidenceSection.getByText("E2E verified governance source").first()).toBeVisible();

  const verification = section(rm, "4. Verification");
  await verification.getByLabel("Verification outcome").selectOption("VERIFIED");
  await verification.getByLabel("Evidence checked").selectOption(setup.evidenceId);
  await verification.getByLabel("Work completed").fill("The medicines control and follow-up audit process were implemented.");
  await verification.getByLabel("Evidence summary").fill("The governed completion record was reviewed in the Evidence Library.");
  await verification.getByLabel("Result against the predefined success measure").fill("Implementation is confirmed; effectiveness still requires later observation.");
  await verification.getByLabel("Verification rationale").fill("The evidence confirms completion but does not yet prove that the control worked.");
  const verificationResponse = rm.waitForResponse(response => response.url().endsWith(`/api/actions/${high.id}/assurance/verification`) && response.request().method() === "POST");
  await verification.getByRole("button", { name: "Record verification" }).click();
  expect((await verificationResponse).status()).toBe(200);
  await rm.reload({ waitUntil: "domcontentloaded" });
  await expect(section(rm, "7. Management assurance and closure")).toContainText("Effectiveness demonstrated");

  const prematureClosure = await closureRequest(rm, high.id, setup.evidenceId, "This should be rejected because effectiveness is still outstanding.", E2E_USERS.organisationOwner.name);
  expect(prematureClosure.status).toBe(409);
  expect(prematureClosure.body.requirements.map((item: { key: string }) => item.key)).toContain("effectiveness");

  const effectiveness = section(rm, "5. Effectiveness and sustained improvement");
  await effectiveness.getByLabel("Effectiveness outcome").selectOption("EFFECTIVE");
  await effectiveness.getByLabel("Baseline").fill("One fictional recurring medicines exception.");
  await effectiveness.getByLabel("Target").fill("No repeat exception in the next audit sample.");
  await effectiveness.getByLabel("Observed result").fill("The subsequent audit sample found no repeat medicines exception.");
  await effectiveness.getByLabel("Effectiveness evidence").selectOption(setup.evidenceId);
  await effectiveness.getByLabel("Management decision").fill("The observed result supports effectiveness and the Action can proceed to closure review.");
  const effectivenessResponse = rm.waitForResponse(response => response.url().endsWith(`/api/actions/${high.id}/assurance/effectiveness`) && response.request().method() === "POST");
  await effectiveness.getByRole("button", { name: "Record effectiveness review" }).click();
  expect((await effectivenessResponse).status()).toBe(200);
  await rm.reload({ waitUntil: "domcontentloaded" });
  await expect(rm.getByText("Ready for closure", { exact: false }).first()).toBeVisible();

  // A third person makes the High Action closure decision.
  const ownerContext = await browser.newContext({ baseURL: origin });
  const owner = await ownerContext.newPage();
  await signIn(owner, E2E_USERS.organisationOwner);
  await owner.goto(`/actions/${high.id}/assurance`, { waitUntil: "domcontentloaded" });
  const closure = section(owner, "7. Management assurance and closure");
  await closure.getByLabel("Closure evidence").selectOption(setup.evidenceId);
  await closure.getByLabel("Management assurance rationale").fill("Completion, separate verification and observed effectiveness are evidenced, with no unresolved dependency.");
  const closureResponse = owner.waitForResponse(response => response.url().endsWith(`/api/actions/${high.id}/assurance/closure`) && response.request().method() === "POST");
  await closure.getByRole("button", { name: "Authorise closure" }).click();
  expect((await closureResponse).status()).toBe(200);
  await owner.reload({ waitUntil: "domcontentloaded" });
  await expect(section(owner, "7. Management assurance and closure")).toContainText(E2E_USERS.organisationOwner.name);
  const afterClosure = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  const after = await afterClosure.json() as Setup;
  expect(after.risks["E2E-RSK-SEC-READY"]).toMatchObject({ status: "OPEN", residualScore: 2 });

  // An Ineffective outcome reopens work and retains earlier completion/verification history.
  await rm.goto(`/actions/${ineffective.id}/assurance`, { waitUntil: "domcontentloaded" });
  const ineffectiveReview = section(rm, "5. Effectiveness and sustained improvement");
  await ineffectiveReview.getByLabel("Effectiveness outcome").selectOption("INEFFECTIVE");
  await ineffectiveReview.getByLabel("Observed result").fill("The follow-up sample found the same fictional medicines exception again.");
  await ineffectiveReview.getByLabel("Effectiveness evidence").selectOption(setup.evidenceId);
  await ineffectiveReview.getByLabel("Management decision").fill("Reopen the Action, review the failed control and assign further corrective work.");
  await ineffectiveReview.getByLabel("Immediate control if recurrence").fill("Registered Manager reviews all current medicines records today.");
  await ineffectiveReview.getByLabel("Management escalation if recurrence").fill("Escalate the failed control to provider governance oversight.");
  const ineffectiveResponse = rm.waitForResponse(response => response.url().endsWith(`/api/actions/${ineffective.id}/assurance/effectiveness`) && response.request().method() === "POST");
  await ineffectiveReview.getByRole("button", { name: "Record effectiveness review" }).click();
  expect((await ineffectiveResponse).status()).toBe(200);
  await rm.reload({ waitUntil: "domcontentloaded" });
  await expect(rm.getByText(/Action reopened/i).first()).toBeVisible();
  await expect(rm.getByText("Completion", { exact: true }).first()).toBeVisible();

  // A Low manual administration Action is proportionate: completion + closure evidence, no forced verification/effectiveness.
  await page.goto(`/actions/${low.id}/assurance`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "4. Verification" })).toContainText("Verification");
  await expect(section(page, "7. Management assurance and closure")).not.toContainText("Completion verified:");
  const lowClosure = await closureRequest(page, low.id, setup.evidenceId, "The administrative change is complete and the linked record is sufficient for proportionate closure.", E2E_USERS.organisationOwner.name);
  expect(lowClosure.status).toBe(200);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(section(page, "7. Management assurance and closure")).toContainText(E2E_USERS.riskOwner.name);

  // Location and tenant boundaries apply to search and mutation APIs.
  const restrictedContext = await browser.newContext({ baseURL: origin });
  const restricted = await restrictedContext.newPage();
  await signIn(restricted, E2E_USERS.locationRestricted);
  const restrictedSearch = await restricted.evaluate(async id => { const response = await fetch(`/api/actions/${id}/evidence-links?role=COMPLETION&q=E2E`); return response.status; }, high.id);
  expect(restrictedSearch).toBe(404);
  await restrictedContext.close();

  const otherContext = await browser.newContext({ baseURL: origin });
  const other = await otherContext.newPage();
  await signIn(other, E2E_USERS.otherTenant);
  await other.goto(`/actions/${high.id}/assurance`, { waitUntil: "domcontentloaded" });
  await expect(other.getByText(/page could not be found/i)).toBeVisible();
  const crossTenantClosure = await other.evaluate(async id => { const form = new FormData(); form.set("intent", "close"); form.set("rationale", "A deliberately unauthorised cross-tenant closure attempt."); const response = await fetch(`/api/actions/${id}/assurance/closure`, { method: "POST", body: form }); return response.status; }, high.id);
  expect(crossTenantClosure).toBe(404);
  await otherContext.close();
  await ownerContext.close();
  await rmContext.close();
});

test("rejected Verification remains historical and a later accepted decision governs current assurance", async ({ page, request }) => {
  test.setTimeout(300_000);
  const setup = await resetAndRead(request);
  const action = setup.actions["E2E-ACT-ASSURANCE-REJECTED"];
  await signIn(page, E2E_USERS.registeredManager);
  await page.goto(`/actions/${action.id}/assurance`, { waitUntil: "domcontentloaded" });
  const verifierId = await page.locator('input[name="verifierId"]').inputValue();

  const rejected = await verificationRequest(page, action.id, setup.evidenceId, verifierId, "FAILED");
  expect(rejected.status).toBe(200);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(section(page, "4. Verification")).toContainText("Failed");
  await expect(section(page, "7. Management assurance and closure")).toContainText(/not accepted/i);
  const blocked = await closureRequest(page, action.id, setup.evidenceId, "Rejected verification means closure must remain blocked.", E2E_USERS.registeredManager.name);
  expect(blocked.status).toBe(409);
  expect(blocked.body.requirements.find((item: { key: string }) => item.key === "verification")?.reason).toMatch(/not accepted/i);

  const correctedLink = await page.evaluate(async ({ id, evidenceId }) => {
    const form = new FormData(); form.set("role", "COMPLETION"); form.append("evidenceIds", evidenceId);
    const response = await fetch(`/api/actions/${id}/evidence-links`, { method: "POST", body: form });
    return response.status;
  }, { id: action.id, evidenceId: setup.correctedEvidenceId });
  expect(correctedLink).toBe(200);
  const accepted = await verificationRequest(page, action.id, setup.correctedEvidenceId, verifierId, "VERIFIED");
  expect(accepted.status).toBe(200);
  await page.reload({ waitUntil: "domcontentloaded" });
  const history = section(page, "4. Verification");
  await expect(history.getByText("Current verification decision")).toBeVisible();
  await expect(history.getByText("Earlier verification decision")).toBeVisible();
  await expect(history.getByText("Verified", { exact: true }).first()).toBeVisible();
  await expect(history.getByText("Failed", { exact: true }).first()).toBeVisible();
  await expect(section(page, "7. Management assurance and closure")).toContainText("Effectiveness demonstrated");
});

test("capability, governance authority, active Evidence and external dependencies are independently enforced", async ({ page, browser, request }) => {
  test.setTimeout(420_000);
  const setup = await resetAndRead(request);
  const high = setup.actions["E2E-ACT-ASSURANCE-HIGH"], low = setup.actions["E2E-ACT-ASSURANCE-LOW"], dependency = setup.actions["E2E-ACT-ASSURANCE-DEPENDENCY"];
  await signIn(page, E2E_USERS.riskOwner);
  await page.goto(`/actions/${high.id}/assurance`, { waitUntil: "domcontentloaded" });
  const ownerId = await page.locator('input[name="verifierId"]').inputValue();
  const origin = new URL(page.url()).origin;

  const rmContext = await browser.newContext({ baseURL: origin });
  const rm = await rmContext.newPage();
  await signIn(rm, E2E_USERS.registeredManager);
  await rm.goto(`/actions/${high.id}/assurance`, { waitUntil: "domcontentloaded" });
  const fakeVerifier = await verificationRequest(rm, high.id, setup.evidenceId, ownerId);
  expect(fakeVerifier.status).toBe(400);
  expect(fakeVerifier.body.error).toMatch(/only your own verification/i);
  const authorisedButIncomplete = await closureRequest(rm, high.id, setup.evidenceId, "Authority alone cannot bypass incomplete assurance requirements.", "ignored-fake-closer");
  expect(authorisedButIncomplete.status).toBe(409);

  const adminContext = await browser.newContext({ baseURL: origin });
  const admin = await adminContext.newPage();
  await signIn(admin, E2E_USERS.actionAdministrator);
  await admin.goto(`/actions/${high.id}/assurance`, { waitUntil: "domcontentloaded" });
  const administratorClosure = await closureRequest(admin, high.id, setup.evidenceId, "Technical Action access must not grant provider governance authority.", "ignored");
  expect(administratorClosure.status).toBe(400);
  expect(administratorClosure.body.error).toMatch(/not authorised.*closure policy/i);

  for (const user of [E2E_USERS.nominatedIndividual, E2E_USERS.viewer]) {
    const context = await browser.newContext({ baseURL: origin });
    const candidate = await context.newPage();
    await signIn(candidate, user);
    await candidate.goto(`/actions/${high.id}/assurance`, { waitUntil: "domcontentloaded" });
    await expect(candidate.getByRole("button", { name: "Authorise closure" })).toHaveCount(0);
    const denial = await candidate.evaluate(async id => {
      const form = new FormData(); form.set("intent", "close"); form.set("rationale", "This user lacks Action-management capability.");
      const response = await fetch(`/api/actions/${id}/assurance/closure`, { method: "POST", body: form });
      return { status: response.status, url: response.url };
    }, high.id);
    expect(denial.url).toMatch(/\/forbidden$/);
    await context.close();
  }

  const invalidRole = await rm.evaluate(async ({ id, evidenceId }) => {
    const form = new FormData(); form.set("role", "NOT_A_GOVERNANCE_ROLE"); form.append("evidenceIds", evidenceId);
    const response = await fetch(`/api/actions/${id}/evidence-links`, { method: "POST", body: form });
    return response.status;
  }, { id: high.id, evidenceId: setup.evidenceId });
  expect(invalidRole).toBe(400);

  await page.goto(`/actions/${low.id}/assurance`, { waitUntil: "domcontentloaded" });
  const retire = page.getByRole("button", { name: "Retire relationship" }).first();
  await retire.click();
  await page.getByLabel("Retirement reason").fill("Incorrectly linked before closure review.");
  const retiredResponse = page.waitForResponse(response => response.url().endsWith(`/api/actions/${low.id}/evidence-links`) && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "Retire and retain history" }).click();
  expect((await retiredResponse).status()).toBe(200);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Completion.*Retired/i).first()).toBeVisible();
  const noCurrentEvidence = await closureRequest(page, low.id, setup.evidenceId, "Retired Evidence must not satisfy the current closure requirement.", "ignored");
  expect(noCurrentEvidence.status).toBe(400);
  expect(noCurrentEvidence.body.error).toContain("Choose closure evidence already linked to this Action");
  await page.goto("/actions", { waitUntil: "domcontentloaded" });
  const lowRow = page.locator("tr").filter({ hasText: "E2E-ACT-ASSURANCE-LOW" });
  await expect(lowRow.locator("td").last()).toContainText("0");

  await page.goto(`/actions/${dependency.id}/assurance`, { waitUntil: "domcontentloaded" });
  await expect(section(page, "5. External dependencies")).toContainText("Fictional Specialist Service");
  const externalBlocked = await closureRequest(page, dependency.id, setup.evidenceId, "Provider work is complete but the external outcome remains outstanding.", "ignored");
  expect(externalBlocked.status).toBe(409);
  expect(externalBlocked.body.requirements.map((item: { key: string }) => item.key)).toContain("dependencies");

  await adminContext.close();
  await rmContext.close();
});

function section(page: Page, heading: string) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

async function verificationRequest(page: Page, id: string, evidenceId: string, fakeVerifier: string, outcome = "VERIFIED") {
  return page.evaluate(async ({ id, evidenceId, fakeVerifier, outcome }) => {
    const form = new FormData(); form.set("outcome", outcome); form.set("verifiedAt", new Date().toISOString().slice(0, 10)); form.set("verifierId", fakeVerifier); form.append("evidenceIds", evidenceId); form.set("completedWork", "The planned control was implemented."); form.set("evidenceSummary", "The governed completion record was checked."); form.set("successMeasureResult", "Implementation was confirmed before effectiveness review."); form.set("rationale", outcome === "FAILED" ? "The evidence does not yet support accepted completion." : "The record supports completion as a separate governance decision.");
    const response = await fetch(`/api/actions/${id}/assurance/verification`, { method: "POST", body: form }); return { status: response.status, body: await response.json() };
  }, { id, evidenceId, fakeVerifier, outcome });
}

async function resetAndRead(request: import("@playwright/test").APIRequestContext) {
  const reset = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(reset.status()).toBe(200);
  const response = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(response.status()).toBe(200);
  return await response.json() as Setup;
}

async function closureRequest(page: Page, id: string, evidenceId: string, rationale: string, fakeCloser: string) {
  return page.evaluate(async ({ id, evidenceId, rationale, fakeCloser }) => {
    const form = new FormData(); form.set("intent", "close"); form.set("rationale", rationale); form.set("closerId", fakeCloser); form.append("evidenceIds", evidenceId);
    const response = await fetch(`/api/actions/${id}/assurance/closure`, { method: "POST", body: form }); return { status: response.status, body: await response.json() };
  }, { id, evidenceId, rationale, fakeCloser });
}
