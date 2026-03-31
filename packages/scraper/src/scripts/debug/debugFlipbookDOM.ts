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
  logger.info("Navigating to viewer:", courseUrl);
  await page.goto(courseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

  const iframeElement = await page.waitForSelector("#ekitIframe", { timeout: 30000 });
  const iframeSrc = await iframeElement?.getAttribute("src");

  if (iframeSrc) {
    logger.info("Navigating into iframe...");
    await page.goto(iframeSrc, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000); // Wait for Flip PDF UI to render

    const maxPage = await page.evaluate(() => {
      let highest = 0;
      const titles = Array.from(document.querySelectorAll('.thumbnailSwiper .title'));
      for (const title of titles) {
        const text = title.textContent || "";
        const nums = text.split('-').map(n => parseInt(n.trim(), 10));
        for (const n of nums) {
          if (!isNaN(n) && n > highest) highest = n;
        }
      }
      return highest;
    });

    logger.info(`Extracted max page count: ${maxPage}`);

    // Look for the images base URL
    const imgBaseUrl = await page.evaluate(() => {
      const firstImg = document.querySelector('.thumbnailSwiper img');
      const src = firstImg?.getAttribute('src');
      if (src) return src;
      return null;
    });

    logger.info(`Sample image SRC from thumbnails: ${imgBaseUrl}`);
  }

  await browser.close();
}
run().catch(err => logger.error("Fatal error in debugFlipbookDOM", err));
