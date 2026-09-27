import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

const ratings = [
  "likelihood",
  "impact",
  "residualLikelihood",
  "residualImpact",
  "targetLikelihood",
  "targetImpact",
] as const;

test("a new Risk waits for six deliberate professional ratings", async ({ page }, testInfo) => {
  await signIn(page, E2E_USERS.riskOwner);
  await page.goto("/risks/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Record and assess a risk" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Chat with Abi/ })).toHaveCount(0);

  const form = page.locator("main form");
  for (const name of ratings) {
    await expect(form.locator(`select[name="${name}"]`), `${name} must start unselected`).toHaveValue("");
  }
  await expect(form.getByText(/^\d+\s*·\s*(LOW|MODERATE|HIGH|CRITICAL)$/)).toHaveCount(0);

  // Supply the factual minimum while leaving only the six ratings unanswered.
  await form.getByLabel("Short risk name").fill("Fictional WP-006 risk for deliberate scoring");
  await form.getByLabel("Cause — why might it happen?").fill("A fictional control might fail.");
  await form.getByLabel("Uncertain event — what might happen?").fill("A fictional step may be missed.");
  await form.getByLabel("Consequences — what harm or disruption could follow?").fill("A fictional service delay could follow.");
  await form.getByLabel("Who or what could be affected?").fill("Fictional service users and staff.");
  await form.getByLabel("Controls currently operating").fill("A fictional daily check is operating.");
  await expect(form.locator("select[name='likelihood']")).toHaveValue("");
  await expect(form.locator('select[name="treatmentStrategy"]')).toHaveValue("");
  await form.getByRole("button", { name: "Create risk and open record" }).click();
  await expect(page).toHaveURL(/\/risks\/new$/);
  for (const name of ratings) {
    await expect(form.locator(`select[name="${name}"]`)).toHaveValue("");
  }
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`wp006-new-risk-${testInfo.project.name}.png`), fullPage: true });
});

test("the Risk Register puts current work and needs attention before analytics", async ({ page }, testInfo) => {
  await signIn(page, E2E_USERS.riskOwner);
  await page.goto("/risks", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Risk Register" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Chat with Abi/ })).toHaveCount(0);

  const currentWork = page.getByRole("heading", { name: "Current work" });
  const needsAttention = page.getByRole("heading", { name: "Needs attention" });
  await expect(currentWork).toBeVisible();
  await expect(needsAttention).toBeVisible();
  const currentWorkBox = await currentWork.boundingBox();
  const analyticsBox = await page.getByText("Open portfolio", { exact: true }).boundingBox();
  expect(currentWorkBox).not.toBeNull();
  expect(analyticsBox).not.toBeNull();
  expect(currentWorkBox!.y).toBeLessThan(analyticsBox!.y);

  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`wp006-risk-register-${testInfo.project.name}.png`), fullPage: true });
});

test("an open Risk exposes formal review and requires deliberate review decisions", async ({ page, request }, testInfo) => {
  const reset = await request.post("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(reset.status()).toBe(200);
  const setup = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(setup.status()).toBe(200);
  const scenarios = ((await setup.json()) as { risks: Record<string, { id: string }> }).risks;
  const riskId = scenarios["E2E-RSK-SEC-READY"].id;

  await signIn(page, E2E_USERS.riskOwner);
  await page.goto(`/risks/${riskId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "READY" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Chat with Abi/ })).toHaveCount(0);
  await expect(page.getByText(/The recorded tolerance is historical/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Current work" })).toContainText("Framework change");

  const reviewLink = page.getByRole("link", { name: "Record formal review" });
  await expect(reviewLink).toBeVisible();
  await expect(reviewLink).toHaveAttribute("href", /^#.+/);
  const reviewHeading = page.getByRole("heading", { name: "Formal risk review" });
  const linkBox = await reviewLink.boundingBox();
  const reviewBox = await reviewHeading.boundingBox();
  expect(linkBox).not.toBeNull();
  expect(reviewBox).not.toBeNull();
  expect(linkBox!.y).toBeLessThan(reviewBox!.y);
  await reviewLink.click();
  await expect(reviewHeading).toBeInViewport();

  const review = reviewHeading.locator("..").locator("form");
  await expect(review.getByLabel("Framework decision")).toHaveValue("");
  for (const label of ["Are controls working?", "Risk position", "Management decision", "Was it escalated?"]) {
    await expect(review.getByLabel(label), `${label} must start unselected`).toHaveValue("");
  }
  await review.getByLabel("Evidence checked", { exact: true }).fill("Fictional evidence checked for an unsubmitted review.");
  await review.getByLabel("Review conclusion *").fill("Fictional review conclusion awaiting deliberate decisions.");
  await review.getByRole("button", { name: "Record formal review" }).click();
  for (const label of ["Are controls working?", "Risk position", "Management decision", "Was it escalated?"]) {
    await expect(review.getByLabel(label)).toHaveValue("");
  }

  const directReview = await page.evaluate(async (id) => {
    const reviewDate = new Date();
    const nextReviewDate = new Date(reviewDate);
    nextReviewDate.setUTCDate(nextReviewDate.getUTCDate() + 30);
    const body = new FormData();
    body.set("reviewDate", reviewDate.toISOString().slice(0, 10));
    body.set("nextReviewDate", nextReviewDate.toISOString().slice(0, 10));
    body.set("likelihood", "2");
    body.set("impact", "2");
    body.set("assuranceChecked", "Fictional evidence was checked.");
    body.set("notes", "Fictional professional review awaiting explicit decisions.");
    body.set("frameworkMode", "KEEP");
    const response = await fetch(`/api/risks/${id}/reviews`, { method: "POST", body });
    return { status: response.status, message: String((await response.json()).error ?? "") };
  }, riskId);
  expect(directReview.status).toBe(400);
  expect(directReview.message).toMatch(/choose the observed control result/i);

  const missingFrameworkDecision = await page.evaluate(async (id) => {
    const reviewDate = new Date();
    const nextReviewDate = new Date(reviewDate);
    nextReviewDate.setUTCDate(nextReviewDate.getUTCDate() + 30);
    const body = new FormData();
    body.set("reviewDate", reviewDate.toISOString().slice(0, 10));
    body.set("nextReviewDate", nextReviewDate.toISOString().slice(0, 10));
    body.set("likelihood", "2");
    body.set("impact", "2");
    body.set("assuranceChecked", "Fictional evidence was checked.");
    body.set("notes", "Fictional professional review with no framework decision.");
    body.set("controlsEffective", "true");
    body.set("trend", "STABLE");
    body.set("decision", "CONTINUE_MONITORING");
    body.set("escalated", "false");
    const response = await fetch(`/api/risks/${id}/reviews`, { method: "POST", body });
    return { status: response.status, message: String((await response.json()).error ?? "") };
  }, riskId);
  expect(missingFrameworkDecision.status).toBe(400);
  expect(missingFrameworkDecision.message).toMatch(/choose how to handle the current Risk Framework/i);

  await page.goto(`/risks/${scenarios["E2E-RSK-SEC-FRAMEWORK-CHANGE"].id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Current risk is above the newer framework tolerance" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Current work" })).toContainText("Framework change");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`wp006-formal-review-${testInfo.project.name}.png`), fullPage: true });
});

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}
