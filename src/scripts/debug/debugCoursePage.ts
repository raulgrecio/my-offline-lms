import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";
import { env } from "../../config/env";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
  console.log("Navigating to course page:", courseUrl);
  
  page.on('request', request => {
    if(request.url().includes('ekit')) console.log("Request detected:", request.url());
  });

  await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000); // let SPA load
  
  // Click guides tab
  const guidesTab = await page.$("#guides-tab");
  if (guidesTab) {
    console.log("Found guides tab, clicking...");
    await guidesTab.click();
    await page.waitForTimeout(5000);
    
    // Now dump html or click flipbooks
    const html = await page.content();
    if (html.includes("ba43ef1c-645a-40ae-833f-662e98b924bb")) {
        console.log("Guide id found in page!");
    }
  } else {
    console.log("No guides tab found.");
  }
  
  await browser.close();
}

run().catch(console.error);
