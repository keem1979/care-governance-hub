import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SOURCE_REFERENCE, E2E_USER, E2E_USERS } from "./fixtures";

const today = dateAfter(0);
const targetDate = dateAfter(30);
const nextReviewDate = dateAfter(60);

test("three authenticated people complete the Critical Risk assurance lifecycle", async ({ page, browser }) => {
  test.setTimeout(600_000);
  const runKey = `e2e-${Date.now()}`;
  const riskReference = `E2E-RSK-${Date.now()}`;

  await signIn(page);
  await page.goto("/risks/new", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Record and assess a risk" })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("Risk reference").fill(riskReference);
  await expect(async () => {
    await page.getByLabel("Link an existing source record").selectOption({ label: `${E2E_SOURCE_REFERENCE} — E2E verified governance source` });
    await expect(page.getByLabel("Source reference")).toHaveValue(E2E_SOURCE_REFERENCE);
  }).toPass({ timeout: 20_000 });
  await page.locator('select[name="category"]').selectOption("Medicines");
  await page.locator('select[name="locationId"]').selectOption({ label: "Guildford Branch" });
  await page.getByLabel("Short risk name").fill(`E2E medicine assurance ${runKey}`);
  await page.getByLabel("Cause — why might it happen?").fill("A competency control may not be applied consistently.");
  await page.getByLabel("Uncertain event — what might happen?").fill("A medicine administration step may be missed.");
  await page.getByLabel("Consequences — what harm or disruption could follow?").fill("A person could experience delayed treatment or avoidable harm.");
  await page.getByLabel("Who or what could be affected?").fill("People receiving medicine support and the care team.");
  await page.locator('select[name="likelihood"]').selectOption("5");
  await page.locator('select[name="impact"]').selectOption("5");
  await page.locator('textarea[name="existingControls"]').fill("Current MAR audit and medication competency checks are operating.");
  await page.locator('select[name="controlEffectiveness"]').selectOption("PARTIALLY_EFFECTIVE");
  await page.getByLabel("How were controls tested?").fill("The linked verified governance source and a sample MAR audit were reviewed.");
  await page.locator('select[name="residualLikelihood"]').selectOption("2");
  await page.locator('select[name="residualImpact"]').selectOption("3");
  await expect(page.getByText(/Organisation Risk Framework v\d+/)).toBeVisible();
  await expect(page.getByText(/Medicines:.*Low.*tolerance.*4/i)).toBeVisible();
  await page.locator('select[name="treatmentStrategy"]').selectOption("REDUCE");
  await page.locator('select[name="ownerId"]').selectOption({ label: E2E_USER.name });
  await page.locator('textarea[name="furtherControls"]').fill(`Complete competency reassessment and MAR re-audit for ${runKey}.`);
  await page.getByLabel("Treatment target date").fill(targetDate);
  await page.locator('select[name="targetLikelihood"]').selectOption("1");
  await page.locator('select[name="targetImpact"]').selectOption("2");
  await page.getByLabel("Key risk indicator").fill("Medication audit exceptions per month");
  await page.getByLabel("Warning threshold").fill("Any repeat omission");
  await page.getByLabel("Immediate escalation route").fill("Escalate to the Registered Manager and assess external notification duties.");
  await page.getByLabel("Review triggers").fill("Any medicine incident, failed audit or competency concern.");
  await page.getByLabel("Next scheduled review").fill(nextReviewDate);
  const createRiskResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/risks") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create risk and open record" }).click();
  expect((await createRiskResponse).status()).toBe(201);
  await expect(page).not.toHaveURL(/\/risks\/new$/, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/risks\/(?!new$)[^/]+$/, { timeout: 60_000 });
  const riskUrl = new URL(page.url()).pathname;
  const riskId = riskUrl.split("/").at(-1)!;
  await expectScore(page, "Current residual", "6");
  await expectScore(page, "Target", "2");
  await expect(page.getByRole("link", { name: "E2E verified governance source" })).toBeVisible();

  await page.getByRole("link", { name: "Create treatment action" }).click();
  await expect(page).toHaveURL(new RegExp(`/actions/new\\?sourceType=RISK&sourceId=${riskId}`), { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Review before creating the central Action" })).toBeVisible();
  await expect(page.getByText(/Completing this Action will not change the Risk automatically/)).toBeVisible();
  await expect(page.getByLabel("Source record")).toHaveValue(`RISK:${riskId}`);
  await expect(page.getByLabel("What must be achieved?")).toHaveValue(new RegExp(runKey));
  await expect(page.getByLabel("Delivery owner")).toHaveValue(/.+/);
  await expect(page.getByLabel("Registered Manager / senior oversight")).toHaveValue(/.+/);
  await expect(page.getByLabel("Due date")).toHaveValue(targetDate);
  let createActionResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/actions") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Check and create action" }).click();
  let actionResponse = await createActionResponse;
  const possibleMatch = page.getByRole("heading", { name: "Review possible existing action" });
  if (actionResponse.status() === 409) {
    await expect(possibleMatch).toBeVisible();
    createActionResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/actions") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Reject match" }).first().click();
    actionResponse = await createActionResponse;
  }
  expect([200, 201]).toContain(actionResponse.status());
  await expect(page).not.toHaveURL(/\/actions\/new/, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/actions\/(?!new$)[^/]+$/, { timeout: 60_000 });
  const actionUrl = new URL(page.url()).pathname;
  const actionId = actionUrl.split("/").at(-1)!;
  await expect(page.getByRole("link", { name: "Open source record" })).toBeVisible();

  // A direct closure request must be rejected while the linked Action remains open.
  const premature=await page.evaluate(async riskId=>{const response=await fetch(`/api/risks/${riskId}/closure`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent:"propose",rationale:"Premature closure while treatment remains unresolved."})});return{status:response.status,body:await response.json()}},riskId);
  expect(premature.status).toBe(409);
  expect(JSON.stringify(premature.body)).toMatch(/linked treatment Actions remain unresolved/i);

  // Complete the canonical Action, with evidence and signed-in verification.
  await page.goto(`${actionUrl}/edit`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByLabel("Status").selectOption("COMPLETED");
  await page.getByLabel("Progress completed (%)").fill("100");
  await page.getByLabel("Management response").fill("The competency reassessment and MAR re-audit were completed.");
  await page.getByLabel("Completion date").fill(today);
  await page.getByLabel("Evidence attached").selectOption({ label: "E2E verified governance source" });
  await page.getByLabel("Action completed summary").fill("Competency reassessment completed and a follow-up MAR sample audited.");
  await page.getByLabel("Evidence reviewed summary").fill("Verified E2E governance source and the recorded completion evidence were reviewed.");
  for (const label of ["Immediate risk controlled", "Underlying record corrected", "Staff support or competency completed", "Wider records checked", "Recurrence check completed"]) {
    await page.getByLabel(label).selectOption("true");
  }
  await page.getByLabel("Verified by").selectOption({ label: E2E_USER.name });
  await page.getByLabel("Verification date").fill(today);
  await page.getByLabel("Verification and closure rationale").fill("The signed-in manager verified that the work and linked evidence meet the completion test.");
  await page.getByLabel("Closure outcome").fill("Action completion verified; effectiveness and Risk reassessment remain separate decisions.");
  await page.getByRole("button", { name: "Save action" }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(actionUrl)}$`), { timeout: 60_000 });
  await expect(page.getByText("Completed · Closed verified", { exact: false })).toBeVisible({ timeout: 30_000 });

  // Completion does not alter the residual Risk or claim that the target is achieved.
  await page.getByRole("link", { name: "Open source record" }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(riskUrl)}$`), { timeout: 60_000 });
  await expectScore(page, "Current residual", "6");
  await expectScore(page, "Target", "2");
  await expect(page.getByText(/completed treatment action is awaiting an effectiveness review/i)).toBeVisible();

  // Test effectiveness on the Action before the formal Risk reassessment.
  await page.goto(`${actionUrl}/assurance`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByLabel("Effectiveness outcome").selectOption("EFFECTIVE");
  await page.getByLabel("Review date").last().fill(today);
  await page.getByLabel("Baseline").fill("One control gap requiring treatment.");
  await page.getByLabel("Target").fill("No repeat exception in the tested sample.");
  await page.getByLabel("Observed result").fill("The follow-up sample showed no repeat exception and the control operated as intended.");
  await page.getByLabel("Supporting evidence").selectOption({ label: "E2E verified governance source" });
  await page.getByLabel("Recurrence identified?").selectOption("false");
  await page.getByLabel("Management decision").fill("Effectiveness is supported for this review period; the RM must still reassess the Risk formally.");
  await page.getByRole("button", { name: "Record effectiveness review" }).click();
  await expect(page.locator("article").filter({ hasText: "The follow-up sample showed no repeat exception" }).getByText("Effective", { exact: true })).toBeVisible({ timeout: 30_000 });

  // Only the formal Risk review can decide that the effectiveness evidence supports
  // a lower current residual score; Action completion itself made no such change.
  await page.goto(riskUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const review = page.getByRole("heading", { name: "Formal risk review" }).locator("..");
  await review.getByRole("button", { name: "Add E2E verified governance source to evidence checked" }).click();
  await review.getByLabel("Current likelihood").selectOption("1");
  await review.getByLabel("Current impact").selectOption("2");
  await review.getByLabel("Risk position").selectOption("IMPROVING");
  await review.getByLabel("Management decision").selectOption("CONTINUE_MONITORING");
  await review.getByLabel("Next review date").fill(nextReviewDate);
  await review.getByLabel("Review conclusion *").fill("Treatment completion and effectiveness were reviewed. The RM decided that the current residual risk is now 2; this was not an automatic target-score update.");
  await review.getByRole("button", { name: "Record formal review" }).click();
  await expect(page.getByText("Treatment completion and effectiveness were reviewed.", { exact: false })).toBeVisible({ timeout: 30_000 });
  await expectScore(page, "Current residual", "2");

  // The Risk owner deliberately proposes closure in the governed review drawer.
  // Authority remains Critical because the record's strongest exposure was
  // Critical, even though the formal residual review is now within tolerance.
  await page.getByRole("button",{name:"Propose closure"}).click();
  let closureDialog=page.getByRole("dialog",{name:"Propose closure"});
  await expect(closureDialog).toContainText(riskReference);
  await expect(closureDialog).toContainText("2 · LOW");
  await closureDialog.getByLabel("Closure rationale").fill("The treatment is complete, effectiveness has been tested, verified evidence is linked and no treatment Action remains unresolved.");
  await closureDialog.getByRole("button",{name:"Propose closure"}).click();
  await expect(page.getByRole("heading",{name:"Closure proposal awaiting decision"})).toBeVisible({timeout:30_000});

  // A client-supplied approver ID cannot impersonate another human, and the
  // owner/proposer cannot self-approve under this Critical policy.
  const selfApproval=await page.evaluate(async ({riskId,fakeApproverId})=>{const response=await fetch(`/api/risks/${riskId}/closure`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent:"approve",rationale:"Attempted owner self approval must be rejected.",approverId:fakeApproverId})});return{status:response.status,body:await response.json()}},{riskId,fakeApproverId:"00000000-0000-4000-8000-000000000999"});
  expect(selfApproval.status).toBe(403);
  expect(JSON.stringify(selfApproval.body)).toMatch(/separation/i);

  const origin=new URL(page.url()).origin;
  const rmContext=await browser.newContext({baseURL:origin});
  const rmPage=await rmContext.newPage();
  await signIn(rmPage,E2E_USERS.registeredManager);
  await rmPage.goto(riskUrl,{waitUntil:"domcontentloaded"});
  await rmPage.getByRole("button",{name:"Approve"}).click();
  closureDialog=rmPage.getByRole("dialog",{name:"Approve closure"});
  await closureDialog.getByLabel("Closure rationale").fill("As Registered Manager I reviewed the Risk, verified Evidence, completed Action and effectiveness assessment.");
  const rmApprovalResponse=rmPage.waitForResponse(response=>response.url().endsWith(`/api/risks/${riskId}/closure`)&&response.request().method()==="POST");
  await closureDialog.getByRole("button",{name:"Approve closure"}).click();
  expect((await rmApprovalResponse).status()).toBe(200);
  await rmPage.reload({waitUntil:"domcontentloaded"});
  await expect(rmPage.getByRole("heading",{name:"Closure proposal awaiting decision"})).toBeVisible();
  await expect(rmPage.getByText(/Approvals: 1 of 2/)).toBeVisible();

  const providerContext=await browser.newContext({baseURL:origin});
  const providerPage=await providerContext.newPage();
  await signIn(providerPage,E2E_USERS.nominatedIndividual);
  await providerPage.goto(riskUrl,{waitUntil:"domcontentloaded"});
  await providerPage.getByRole("button",{name:"Approve"}).click();
  closureDialog=providerPage.getByRole("dialog",{name:"Approve closure"});
  await closureDialog.getByLabel("Closure rationale").fill("As provider-level authority I independently reviewed the Critical Risk closure trail and approve closure.");
  const providerApprovalResponse=providerPage.waitForResponse(response=>response.url().endsWith(`/api/risks/${riskId}/closure`)&&response.request().method()==="POST");
  await closureDialog.getByRole("button",{name:"Approve closure"}).click();
  expect((await providerApprovalResponse).status()).toBe(200);
  await providerPage.reload({waitUntil:"domcontentloaded"});
  await expect(providerPage.getByText("Medicines · Closed", { exact: false })).toBeVisible();
  await expect(providerPage.getByRole("heading",{name:"Closure decision history"}).locator("..")).toContainText(E2E_USERS.registeredManager.name);
  await expect(providerPage.getByRole("heading",{name:"Closure decision history"}).locator("..")).toContainText(E2E_USERS.nominatedIndividual.name);
  await rmContext.close();
  await providerContext.close();

  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.getByText("Medicines · Closed", { exact: false })).toBeVisible();
  await expect(page.getByText(E2E_USERS.nominatedIndividual.name, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review history" }).locator("..")).toContainText("current residual risk is now 2");

  // The immutable activity trail still contains create, review and closure updates.
  await page.goto(`/activity?q=${encodeURIComponent(riskReference)}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Audit trail" })).toBeVisible();
  await expect(page.getByText(new RegExp(`Added risk: ${escapeRegExp(riskReference)}`))).toBeVisible();
  await expect(page.getByText(`Reviewed risk: ${riskReference}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Proposed closure of risk: ${riskReference}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Approved and closed risk closure: ${riskReference}`, { exact: true })).toBeVisible();

  expect(actionId).toBeTruthy();
});

async function expectScore(page: Page, label: string, score: string) {
  const card = page.getByText(label, { exact: true }).first().locator("..");
  await expect(card.getByText(score, { exact: true })).toBeVisible({ timeout: 30_000 });
}

function dateAfter(days: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
