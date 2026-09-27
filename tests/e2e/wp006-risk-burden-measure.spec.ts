import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

const ratingNames = ["likelihood", "impact", "residualLikelihood", "residualImpact", "targetLikelihood", "targetImpact"];
const reviewDecisionNames = ["controlsEffective", "trend", "decision", "escalated"];

test("measure the Risk experience without changing records", async ({ page, request }, testInfo) => {
  test.setTimeout(180_000);
  const setupResponse = await request.get("/api/test/e2e/setup", { headers: { "x-e2e-setup-token": E2E_SETUP_TOKEN } });
  expect(setupResponse.status()).toBe(200);
  const setup = await setupResponse.json() as { risks: Record<string, { id: string }> };
  const riskId = setup.risks["E2E-RSK-SEC-READY"].id;
  await signIn(page, E2E_USERS.riskOwner);

  await page.goto("/risks", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Risk Register" })).toBeVisible();
  const list = await page.evaluate(() => {
    const main = document.querySelector("main");
    const title = main?.querySelector("h1");
    const firstRiskLink = [...(main?.querySelectorAll('a[href^="/risks/"]') ?? [])]
      .find(link => /^\/risks\/[0-9a-f-]{36}$/.test(link.getAttribute("href") ?? ""));
    const headings = [...(main?.querySelectorAll("h1,h2,h3,h4,h5,h6") ?? [])];
    const currentWorkHeading = headings.find(heading => heading.textContent?.trim() === "Current work");
    const needsAttentionHeading = headings.find(heading => heading.textContent?.trim() === "Needs attention");
    const currentWorkSection = currentWorkHeading?.closest("section");
    return {
      riskListTopY: y(title),
      firstActionableRiskY: y(firstRiskLink),
      currentWorkVisible: visible(currentWorkHeading),
      needsAttentionVisible: visible(needsAttentionHeading),
      currentWorkVisibleRiskLinks: currentWorkSection
        ? [...currentWorkSection.querySelectorAll('a[href^="/risks/"]')]
          .filter(link => /^\/risks\/[0-9a-f-]{36}$/.test(link.getAttribute("href") ?? "") && visible(link)).length
        : 0,
    };
    function y(element: Element | null | undefined) {
      return element ? Math.round(element.getBoundingClientRect().top + window.scrollY) : null;
    }
    function visible(element: Element | null | undefined) {
      return Boolean(element && element.getClientRects().length);
    }
  });
  await page.screenshot({ path: testInfo.outputPath(`wp006-measure-list-${testInfo.project.name}.png`), fullPage: true });

  await page.goto("/risks/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Record and assess a risk" })).toBeVisible();
  const newRisk = await selectedCount(page, ratingNames);
  await page.screenshot({ path: testInfo.outputPath(`wp006-measure-new-${testInfo.project.name}.png`), fullPage: true });

  await page.goto(`/risks/${riskId}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main h1")).toBeVisible();
  const detail = await page.evaluate(() => {
    const main = document.querySelector("main");
    const heading = [...(main?.querySelectorAll("h1,h2,h3,h4,h5,h6") ?? [])]
      .find(element => element.textContent?.trim() === "Formal risk review");
    const formalReviewLink = [...(main?.querySelectorAll("a") ?? [])]
      .find(link => link.textContent?.trim() === "Record formal review");
    const position = (element: Element | null | undefined) =>
      element ? Math.round(element.getBoundingClientRect().top + window.scrollY) : null;
    return {
      riskDetailTopY: position(main?.querySelector("h1")),
      formalReviewHeadingY: position(heading),
      formalReviewLinkY: position(formalReviewLink),
    };
  });
  const review = await selectedCount(page, reviewDecisionNames);
  await page.screenshot({ path: testInfo.outputPath(`wp006-measure-detail-${testInfo.project.name}.png`), fullPage: true });

  const measurement = {
    project: testInfo.project.name,
    viewport: page.viewportSize(),
    list: {
      ...list,
      firstActionableRiskOffsetFromTop: difference(list.firstActionableRiskY, list.riskListTopY),
    },
    newRisk: { preselectedProfessionalRatings: newRisk },
    detail: {
      ...detail,
      formalReviewOffsetFromTop: difference(detail.formalReviewHeadingY, detail.riskDetailTopY),
      preselectedReviewDecisions: review,
    },
  };
  const output = testInfo.outputPath(`wp006-risk-burden-${testInfo.project.name}.json`);
  await writeFile(output, `${JSON.stringify(measurement, null, 2)}\n`, "utf8");
  console.log(`WP006_RISK_BURDEN ${JSON.stringify(measurement)}`);
});

async function selectedCount(page: Page, names: string[]) {
  return page.evaluate(namesToRead => namesToRead.filter(name => {
    const field = document.querySelector<HTMLSelectElement>(`main select[name="${name}"]`);
    return Boolean(field?.value);
  }).length, names);
}

function difference(a: number | null, b: number | null) {
  return a === null || b === null ? null : a - b;
}
