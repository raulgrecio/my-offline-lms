import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";

import { env } from "@config/env";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  let captureTraffic = false;
  page.on("request", req => {
      if (captureTraffic) {
          console.log(`[GUIDE CLICK NETWORK] ${req.method()} ${req.url()}`);
      }
  });

  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
  console.log("Navigating to course page:", courseUrl);
  await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000); 
  
  const guidesTab = await page.$("#guides-tab");
  if (guidesTab) {
    console.log("Found guides tab, clicking...");
    await guidesTab.click();
    await page.waitForTimeout(5000); 
    
    const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div'));
        const guideEl = buttons.find(el => el.textContent?.includes('Student Guide') || el.textContent?.includes('Activity Guide'));
        if (guideEl) {
            (guideEl as HTMLElement).click();
            return true;
        }
        return false;
    });
    
    if (clicked) {
        console.log("Clicked on a Guide! Enabling network capture...");
        captureTraffic = true;
        await page.waitForTimeout(10000);
    } else {
        console.log("Could not find a guide to click.");
    }
  } else {
      console.log("No guides tab.");
  }
  
  await browser.close();
}
run().catch(console.error);
