import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";
import fs from "fs";
import { env } from "@config/env";
import { logger } from "@platform/logging";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
  logger.info("Navigating to course page:", courseUrl);
  await page.goto(courseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(10000); 
  
  const guidesTab = await page.getByText("Guides", { exact: true }).first();
  if (guidesTab) {
    logger.info("Found guides tab, clicking...");
    await guidesTab.click();
    await page.waitForTimeout(5000); 
    
    // Dump the HTML of the entire guides list!
    const html = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('*'));
        const guideTitle = spans.find(span => span.textContent?.trim() === 'Oracle AI Database: Deploy, Patch, and Upgrade Workshop (Student Guide)');
        if (guideTitle) {
            let container = guideTitle.parentElement;
            for(let i=0; i<4; i++) {
                if(container && container.parentElement) container = container.parentElement;
            }
            return container?.innerHTML;
        }
        return "Not found";
    });
    
    fs.writeFileSync('/tmp/guide_row.html', html || '');
    logger.info("Wrote guide row HTML to /tmp/guide_row.html");
  }
  
  await browser.close();
}
run().catch(logger.error);
