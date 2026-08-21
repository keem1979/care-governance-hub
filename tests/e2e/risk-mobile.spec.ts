import { expect,test } from "@playwright/test";
import { signIn } from "./auth";
import { E2E_SETUP_TOKEN,E2E_USERS } from "./fixtures";

test("mobile RM-critical Risk and Framework surfaces remain operable",async({page,request,browser},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile","Targeted mobile release check");
  test.setTimeout(180_000);
  const setup=await request.get("/api/test/e2e/setup",{headers:{"x-e2e-setup-token":E2E_SETUP_TOKEN}});
  const scenarios=((await setup.json()) as {risks:Record<string,{id:string}>}).risks;
  await signIn(page,E2E_USERS.riskOwner);
  await page.goto("/risks",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("heading",{name:"Risk Register"})).toBeVisible();
  await expectNoPageOverflow(page);

  const readyId=scenarios["E2E-RSK-SEC-READY"].id;
  await page.goto(`/risks/${readyId}`,{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("heading",{name:"READY"})).toBeVisible();
  await page.getByRole("button",{name:"Propose closure"}).click();
  const dialog=page.getByRole("dialog",{name:"Propose closure"});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading",{name:"Evidence"})).toBeVisible();
  await expectMinimumTouchTarget(dialog.getByRole("button",{name:"Close closure assurance review"}));
  await expectMinimumTouchTarget(dialog.getByRole("button",{name:"Propose closure"}));
  await dialog.getByRole("button",{name:"Cancel"}).click();
  await expectNoPageOverflow(page);

  await page.goto(`/risks/${scenarios["E2E-RSK-SEC-LEGACY"].id}`,{waitUntil:"domcontentloaded"});
  await expect(page.getByLabel("Framework decision")).toBeVisible();
  await expect(page.getByRole("link",{name:"Create treatment action"})).toBeVisible();
  await expectNoPageOverflow(page);

  await page.getByRole("button",{name:"Open navigation"}).click();
  await page.getByRole("button",{name:"Sign out"}).click();
  await expect(page).toHaveURL(/\/login/,{timeout:30_000});
  const ownerContext=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const ownerPage=await ownerContext.newPage();
  await signIn(ownerPage,E2E_USERS.organisationOwner);
  await ownerPage.goto("/settings/risk-framework",{waitUntil:"domcontentloaded"});
  await expect(ownerPage.getByRole("heading",{name:"Risk Framework"})).toBeVisible();
  await expect(ownerPage.getByText(/Closure Policy v/i).first()).toBeVisible();
  await expectNoPageOverflow(ownerPage);
  await ownerContext.close();
});

test("mobile Evidence Library and Risk Control search remain operable",async({page,request},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile","Targeted mobile release check");
  test.setTimeout(180_000);
  const setup=await request.get("/api/test/e2e/setup",{headers:{"x-e2e-setup-token":E2E_SETUP_TOKEN}});
  const scenarios=((await setup.json()) as {risks:Record<string,{id:string}>}).risks;
  await signIn(page,E2E_USERS.riskOwner);

  await page.goto("/evidence",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("heading",{name:"Evidence Library"})).toBeVisible();
  await expect(page.getByPlaceholder("Search title, source, reference or exact tag")).toBeVisible();
  await expectMinimumTouchTarget(page.getByRole("button",{name:"Apply filters"}));
  await expectNoPageOverflow(page);

  await page.goto(`/risks/${scenarios["E2E-RSK-SEC-READY"].id}`,{waitUntil:"domcontentloaded"});
  const search=page.locator("details").filter({hasText:"Search authorised Evidence"}).first();
  await search.locator("summary").click();
  await expect(search.getByLabel("Search Evidence")).toBeVisible();
  await expectMinimumTouchTarget(search.getByRole("button",{name:"Search Evidence"}));
  await expectNoPageOverflow(page);

  await page.goto("/settings/provider-controls",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("heading",{name:"Provider Control Library"})).toBeVisible();
  await expectMinimumTouchTarget(page.getByText("Create a Provider Control draft",{exact:true}));
  await expectNoPageOverflow(page);
});

async function expectNoPageOverflow(page:import("@playwright/test").Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true)}
async function expectMinimumTouchTarget(locator:import("@playwright/test").Locator){const box=await locator.boundingBox();expect(box).not.toBeNull();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44)}
