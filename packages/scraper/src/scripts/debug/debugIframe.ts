import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import { env } from "@scraper/config";
import { logger } from "@scraper/platform/logging";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  const baseUrl = env.PLATFORM_BASE_URL;
  const url = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
 
  logger.info("Navigating to", url);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  
  await page.waitForTimeout(5000); // 5 seconds extra to be safe
  const html = await page.content();
  logger.info(html.substring(0, 500));
  
  if (html.includes("ekitIframe")) {
    logger.info("ekitIframe found in HTML!");
  } else {
    logger.info("ekitIframe NOT found. Saving HTML to /tmp/debug.html");
    fs.writeFileSync("/tmp/debug.html", html);
  }
  
  await browser.close();
}

run().catch(logger.error);
