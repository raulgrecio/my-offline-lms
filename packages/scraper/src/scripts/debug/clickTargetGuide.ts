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

  context.on('page', async newPage => {
    logger.info(`\n[NEW TAB OPENED] ${newPage.url()}`);
    await newPage.waitForLoadState('domcontentloaded');
    logger.info(`[NEW TAB LOADED] ${newPage.url()}`);
    fs.writeFileSync('/tmp/guide_tab.html', await newPage.content());
    await newPage.screenshot({ path: "/tmp/guide_tab.png", fullPage: true });
  });

  page.on("request", req => {
    const url = req.url();
    if (url.includes("pdf") || url.includes("ekit") || url.includes("brm-materials") || url.includes("viewer") || url.includes("htmlViewer")) {
      logger.info(`[NETWORK CAPTURE] ${req.method()} ${url}`);
    }
  });

  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
  logger.info("Navigating to course page:", courseUrl);
  await page.goto(courseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);

  const guidesTab = await page.getByText("Guides", { exact: true }).first();
  if (guidesTab) {
    logger.info("Found guides tab, clicking...");
    await guidesTab.click();
    await page.waitForTimeout(5000);

    // We know the id is 234127 from the intercepted JSON!
    const btnSelector = '#guide-btn-234127 button';

    const elements = await page.$$(btnSelector);
    if (elements.length > 0) {
      logger.info(`Found explicit button ${btnSelector}. Clicking!`);
      await page.click(btnSelector);

      logger.info("Waiting 15 seconds to observe network/DOM changes...");
      await page.waitForTimeout(15000);

      // Take a screenshot to see if it opened a modal IN THE SAME PAGE
      await page.screenshot({ path: "/tmp/guide_ui_clicked.png", fullPage: true });

      // Dump potential iframes in the current page
      const iframeSrcs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(i => i.src);
      });
      logger.info(`Current page iframes after click: ${iframeSrcs.join(', ')}`);

      fs.writeFileSync('/tmp/course_after_precise_click.html', await page.content());
      logger.info("Saved screenshots and state.");
    } else {
      logger.info(`Could not find button ${btnSelector}.`);
    }
  }

  await browser.close();
}
run().catch(err => logger.error("Fatal error in clickTargetGuide", err));
