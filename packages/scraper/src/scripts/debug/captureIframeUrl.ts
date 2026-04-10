import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";

import { env } from "@scraper/config";
import { logger } from "@scraper/platform/logging";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  page.on("request", req => {
      const url = req.url();
      if (url.includes("ekit") || url.includes("brm-materials") || url.includes("htmlViewer") || url.includes("pdf")) {
          logger.info(`[NETWORK] ${req.method()} ${url}`);
      }
  });

  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
  await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000); // UI render
  
  const guidesTab = await page.$("#guides-tab");
  if (guidesTab) {
    logger.info("Found guides tab, clicking...");
    await guidesTab.click();
    await page.waitForTimeout(5000); // let guides list render
    
    // Most likely we need to click the specific guide button/link. Let's find it.
    // In our JSON we saw ekitId: ba43ef1c-645a-40ae-833f-662e98b924bb
    // We can evaluate and click
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
        logger.info("Clicked on a Guide! Waiting for iframe...");
        await page.waitForTimeout(10000);
        
        const iframeSrc = await page.evaluate(() => {
            const iframe = document.querySelector('iframe');
            return iframe ? iframe.src : null;
        });
        logger.info(`[IFRAME SRC] ${iframeSrc}`);
    } else {
        logger.info("Could not find a guide to click.");
    }

  } else {
      logger.info("No guides tab.");
  }
  
  await browser.close();
}
run().catch(logger.error);
