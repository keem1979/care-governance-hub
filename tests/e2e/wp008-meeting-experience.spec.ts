import { expect, test } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_USERS } from "./fixtures";

test("meeting current work leads to the relevant edit step while supporting context stays available", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await signIn(page, E2E_USERS.registeredManager);
  await page.goto("/meetings/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Schedule governance meeting" })).toBeVisible();

  const title = `WP008 fictional governance review ${Date.now()}`;
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Meeting title").fill(title);
  await page.getByLabel("Date", { exact: true }).fill(yesterday);
  await page.getByLabel("Room or video link").fill("Fictional secure meeting room");
  await page.getByRole("combobox", { name: "Chair", exact: true }).selectOption({ label: E2E_USERS.registeredManager.name });
  const created = page.waitForResponse((response) => response.url().endsWith("/api/meetings") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create meeting record" }).click();
  expect((await created).status()).toBe(201);
  await expect(page).toHaveURL(/\/meetings\/[0-9a-f-]{36}$/);

  const meetingUrl = new URL(page.url());
  const meetingId = meetingUrl.pathname.split("/").at(-1)!;
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const attention = page.getByRole("region", { name: "What needs attention" });
  const currentWork = page.getByRole("region", { name: "Current work" });
  await expect(attention).toContainText("Complete the minutes");
  await expect(currentWork).toBeVisible();
  const minutesLink = attention.getByRole("link", { name: /Write minutes/ });
  await expect(minutesLink).toHaveAttribute("href", `/meetings/${meetingId}/edit#minutes`);
  const details = page.locator("details").filter({ has: page.locator("summary", { hasText: "Meeting context and review detail" }) });
  await expect(details).toHaveCount(1);
  expect(await details.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
  await expect(page.locator("main").last()).not.toContainText(/\b\d{1,3}%/);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`wp008-meeting-detail-${testInfo.project.name}.png`), fullPage: true });

  await minutesLink.click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${meetingId}/edit#minutes$`));
  await expect(page.getByRole("heading", { name: "Update meeting record" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById("minutes")?.getBoundingClientRect().top ?? Infinity)).toBeLessThan(400);
  await expect(page.getByLabel("Formal minutes")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Meeting work" }).getByRole("link", { name: "Minutes" })).toHaveAttribute("href", "#minutes");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`wp008-meeting-edit-${testInfo.project.name}.png`), fullPage: true });

  // The record is now read-only in the detail experience; no active edit CTA
  // should survive the governed archive transition.
  const archived = await page.evaluate(async (id) => {
    const response = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "archive" }),
    });
    return response.status;
  }, meetingId);
  expect(archived).toBe(200);
  await page.goto(`/meetings/${meetingId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "What needs attention" })).toContainText("No current work");
  await expect(page.getByRole("link", { name: "Update meeting" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Write minutes/ })).toHaveCount(0);
  await expect(page.getByText("Meeting context and review detail")).toBeVisible();
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test("a location-restricted manager cannot choose or create an organisation-wide meeting", async ({ page }) => {
  await signIn(page, E2E_USERS.locationRestricted);
  await page.goto("/meetings/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Schedule governance meeting" })).toBeVisible();
  const service = page.getByRole("combobox", { name: "Service location" });
  await expect(service.getByRole("option", { name: "Organisation-wide" })).toHaveCount(0);

  // A crafted request cannot bypass the selector's scoped choices.
  const result = await page.evaluate(async () => {
    const body = new FormData();
    body.set("title", `Fictional unauthorised meeting ${Date.now()}`);
    body.set("meetingType", "Monthly governance");
    body.set("meetingDate", new Date().toISOString().slice(0, 10));
    body.set("meetingTime", "10:00");
    body.set("locationOrLink", "Fictional meeting room");
    body.set("locationId", "");
    body.set("chairId", "forged-chair");
    body.set("agendaTitle", "Review current work");
    const response = await fetch("/api/meetings", { method: "POST", body });
    return { status: response.status, body: await response.json() };
  });
  expect(result.status).toBe(400);
  expect(result.body.error).toMatch(/outside your authorised editing locations/i);
});
