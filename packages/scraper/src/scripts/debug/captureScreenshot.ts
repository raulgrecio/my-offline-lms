import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";

import { env } from "@scraper/config/env";
import { logger } from "@scraper/platform/logging";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
  logger.info("Navigating to course page:", courseUrl);
  await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000); 
  
  const guidesTab = await page.$("#guides-tab");
  if (guidesTab) {
    logger.info("Found guides tab, clicking...");
    await guidesTab.click();
    await page.waitForTimeout(5000); 
    
    // Screenshot 1: After clicking guides tab
    await page.screenshot({ path: "/tmp/screenshot1.png", fullPage: true });
    
    // Evaluate and click
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div, span'));
        const guideEl = buttons.find(el => el.textContent?.includes('Student Guide') || el.textContent?.includes('Activity Guide'));
        if (guideEl) {
            (guideEl as HTMLElement).click();
        }
    });
    
    logger.info("Clicked guide element. Waiting 10s...");
    await page.waitForTimeout(10000);
    
    // Screenshot 2: After clicking a specific guide
    await page.screenshot({ path: "/tmp/screenshot2.png", fullPage: true });
    logger.info("Screenshots saved to /tmp/screenshot1.png and /tmp/screenshot2.png");
  }
  
  await browser.close();
}
run().catch(logger.error);
