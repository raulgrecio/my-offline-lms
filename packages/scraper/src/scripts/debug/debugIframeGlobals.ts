import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";
import fs from "fs";
import { env } from "@scraper/config";
import { logger } from "@scraper/platform/logging";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
  logger.info("Navigating to viewer page:", courseUrl);
  await page.goto(courseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  
  const iframeElement = await page.waitForSelector("#ekitIframe", { timeout: 30000 });
  const iframeSrc = await iframeElement?.getAttribute("src");
  logger.info("Found ekitIframe src:", iframeSrc || undefined);
  
  if (iframeSrc) {
      await page.goto(iframeSrc, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(5000);
      
      const html = await page.content();
      fs.writeFileSync('/tmp/iframe_content.html', html);
      logger.info("Wrote iframe content to /tmp/iframe_content.html");
      
      const globals = await page.evaluate(() => {
          return Object.keys(window).filter(k => k.toLowerCase().includes('pdf') || k.toLowerCase().includes('viewer') || k.toLowerCase().includes('ekit') || k.toLowerCase().includes('doc'));
      });
      
      logger.info(`Globals matching pdf/viewer/ekit: ${globals.join(', ')}`);
  }
  
  await browser.close();
}
run().catch(err => logger.error("Fatal error in debugIframeGlobals", err));
