import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";

import { env } from "@config/env";
import { logger } from "@platform/logging";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  let captureTraffic = false;
  page.on("request", req => {
      if (captureTraffic) {
          logger.info(`[GUIDE CLICK NETWORK] ${req.method()} ${req.url()}`);
      }
  });

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
        logger.info("Clicked on a Guide! Enabling network capture...");
        captureTraffic = true;
        await page.waitForTimeout(10000);
    } else {
        logger.info("Could not find a guide to click.");
    }
  } else {
      logger.info("No guides tab.");
  }
  
  await browser.close();
}
run().catch(logger.error);
