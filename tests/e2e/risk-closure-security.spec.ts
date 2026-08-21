import { expect, test, type Browser, type Page } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN, E2E_USERS } from "./fixtures";

type ScenarioMap=Record<string,{id:string;locationId:string|null}>;

test("closure API enforces assurance, role, location and tenant boundaries",async({page,browser,request})=>{
  test.setTimeout(240_000);
  const setup=await request.get("/api/test/e2e/setup",{headers:{"x-e2e-setup-token":E2E_SETUP_TOKEN}});
  expect(setup.status()).toBe(200);
  const scenarios=((await setup.json()) as {risks:ScenarioMap}).risks;
  await signIn(page,E2E_USERS.riskOwner);

  const frameworkChangeId=scenarios["E2E-RSK-SEC-FRAMEWORK-CHANGE"].id;
  await page.goto(`/risks/${frameworkChangeId}`,{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Residual score 8; tolerance 9.",{exact:false})).toBeVisible();
  const frameworkException=page.getByRole("heading",{name:"A newer organisation Risk Framework applies"}).locator("..");
  await expect(frameworkException).toContainText("historical Risk has not been rewritten");
  await expect(frameworkException).toContainText("outside the current organisation tolerance");
  const review=page.getByRole("heading",{name:"Formal risk review"}).locator("..");
  await review.getByLabel("Framework decision").selectOption("APPLY_CURRENT");
  await review.getByLabel("Evidence checked").fill("Historical fictional evidence and the changed tolerance were reviewed.");
  await review.getByLabel("Current likelihood").selectOption("2");
  await review.getByLabel("Current impact").selectOption("4");
  await review.getByLabel("Next review date").fill("2026-10-01");
  await review.getByLabel("Review conclusion *").fill("The score remains eight. The manager deliberately adopts Framework v2 and records that the governance threshold changed, not the underlying exposure.");
  const reviewResponse=page.waitForResponse(response=>response.url().endsWith(`/api/risks/${frameworkChangeId}/reviews`)&&response.request().method()==="POST");
  await review.getByRole("button",{name:"Record formal review"}).click();
  expect((await reviewResponse).status()).toBe(200);
  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.getByText("Residual score 8; tolerance 4.",{exact:false})).toBeVisible();
  await expect(page.getByRole("heading",{name:"A newer organisation Risk Framework applies"})).toHaveCount(0);

  await page.goto(`/risks/${scenarios["E2E-RSK-SEC-LEGACY"].id}`,{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Residual score 8; tolerance 9.",{exact:false})).toBeVisible();
  await expect(page.getByText(/historical Risk has not been rewritten/)).toBeVisible();
  await expect(page.getByLabel("Framework decision")).toHaveValue("KEEP");

  await expectBlocked(page,scenarios["E2E-RSK-SEC-MISSING-EVIDENCE"].id,/closure evidence is required/i);
  await expectBlocked(page,scenarios["E2E-RSK-SEC-MISSING-VERIFICATION"].id,/verified Evidence is required/i);
  await expectBlocked(page,scenarios["E2E-RSK-SEC-MISSING-EFFECTIVENESS"].id,/effectiveness must be assessed/i);
  await expectBlocked(page,scenarios["E2E-RSK-SEC-OUTSIDE-TOLERANCE"].id,/within the applicable tolerance/i);
  await expectBlocked(page,scenarios["E2E-RSK-SEC-UNRESOLVED-ACTION"].id,/Actions remain unresolved/i);

  const readyId=scenarios["E2E-RSK-SEC-READY"].id;
  expect((await closureRequest(page,readyId,"propose","Sufficient fictional assurance exists to test retained withdrawal history.")).status).toBe(200);
  expect((await closureRequest(page,readyId,"withdraw","Additional verification was discovered and the proposal must be withdrawn.")).status).toBe(200);
  expect((await closureRequest(page,readyId,"propose","Corrective review is complete and a new proposal is deliberately recorded.")).status).toBe(200);

  const rolePage=await authenticatedPage(browser,page,E2E_USERS.viewer);
  await expectStatus(rolePage,scenarios["E2E-RSK-SEC-MISSING-EVIDENCE"].id,403);
  await rolePage.context().close();

  const locationPage=await authenticatedPage(browser,page,E2E_USERS.locationRestricted);
  await expectStatus(locationPage,scenarios["E2E-RSK-SEC-MISSING-EVIDENCE"].id,404);
  await locationPage.context().close();

  const otherTenantPage=await authenticatedPage(browser,page,E2E_USERS.otherTenant);
  await expectStatus(otherTenantPage,scenarios["E2E-RSK-SEC-MISSING-EVIDENCE"].id,404);
  await otherTenantPage.context().close();

  const rmPage=await authenticatedPage(browser,page,E2E_USERS.registeredManager);
  const changed=await closureRequest(rmPage,scenarios["E2E-RSK-SEC-POLICY-CHANGED"].id,"approve","Approval must be rejected because the effective policy changed.");
  expect(changed.status).toBe(409);
  expect(JSON.stringify(changed.body)).toMatch(/policy changed.*re-propose/i);
  const rejected=await closureRequest(rmPage,readyId,"reject","Effectiveness evidence is not yet sufficient for provider assurance.");
  expect(rejected.status).toBe(200);
  await rmPage.context().close();

  await page.goto(`/risks/${readyId}`,{waitUntil:"domcontentloaded"});
  const history=page.getByRole("heading",{name:"Closure decision history"}).locator("..");
  await expect(history).toContainText("Additional verification was discovered");
  await expect(history).toContainText("Effectiveness evidence is not yet sufficient");
  await expect(history).toContainText(E2E_USERS.registeredManager.name);
});

async function expectBlocked(page:Page,riskId:string,message:RegExp){const result=await closureRequest(page,riskId);expect(result.status).toBe(409);expect(JSON.stringify(result.body)).toMatch(message)}
async function expectStatus(page:Page,riskId:string,status:number){const result=await closureRequest(page,riskId);expect(result.status).toBe(status)}
async function closureRequest(page:Page,riskId:string,intent:"propose"|"approve"|"reject"|"withdraw"="propose",rationale="Fictional direct API release-gate attempt."){return page.evaluate(async input=>{const response=await fetch(`/api/risks/${input.riskId}/closure`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent:input.intent,rationale:input.rationale})});return{status:response.status,body:await response.json()}},{riskId,intent,rationale})}
async function authenticatedPage(browser:Browser,sourcePage:Page,user:Parameters<typeof signIn>[1]){const context=await browser.newContext({baseURL:new URL(sourcePage.url()).origin});const page=await context.newPage();await signIn(page,user);return page}
