import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";
import { env } from "@scraper/config"
import { logger } from "@scraper/platform/logging";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  context.on('page', async newPage => {
      logger.info(`[NEW TAB OPENED] Waiting for URL...`);
      await newPage.waitForLoadState('domcontentloaded');
      logger.info(`[NEW TAB URL] ${newPage.url()}`);
      
      const content = await newPage.content();
      if(content.includes('ekitIframe') || content.includes('pdfObj')) {
          logger.info(`[NEW TAB] Contains PDF viewer!`);
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
    
    // Evaluate and click
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div, span'));
        const guideEl = buttons.find(el => el.textContent?.includes('Student Guide') || el.textContent?.includes('Activity Guide'));
        if (guideEl) {
            (guideEl as HTMLElement).click();
        }
    });
    
    logger.info("Clicked guide element. Waiting 15s for new tabs...");
    await page.waitForTimeout(15000);
  }
  
  await browser.close();
}
run().catch(logger.error);
