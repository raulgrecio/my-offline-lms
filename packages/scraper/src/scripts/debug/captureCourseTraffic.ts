import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";
import fs from "fs";

import { env } from "@scraper/config/env";
import { AssetNamingService } from "@scraper/features/asset-download/infrastructure/AssetNamingService";
import { logger } from "@scraper/platform/logging";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes(".json") || response.headers()["content-type"]?.includes("application/json")) {
        try {
            const body = await response.json();
            logger.info(`[JSON Dump] ${url}`);
            
            // Si el body contiene ba43ef1c o ekitId o htmlViewer, guardarlo
            const strBody = JSON.stringify(body);
            const namingService = new AssetNamingService();
            if (strBody.includes("transcript") || strBody.includes("vtt") || strBody.includes("ba43ef1c")) {
                const urlObj = new URL(url);
                const safeUrl = namingService.generateSafeFilename(urlObj.pathname.replace(/\//g, ' '));
                fs.writeFileSync(`/tmp/intercept_${safeUrl}.json`, JSON.stringify(body, null, 2));
                logger.info(`✅ Saved suspicious JSON: /tmp/intercept_${safeUrl}.json`);
            }
        } catch(e) {}
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
    await page.waitForTimeout(6000);
  }
  
  await browser.close();
}
run().catch(logger.error);
