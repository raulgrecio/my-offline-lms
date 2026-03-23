import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

import { env } from "@config/env";
import { getAuthState } from "@config/paths";
import { logger } from "@platform/logging";

chromium.use(stealth());

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: await getAuthState() });
    const page = await context.newPage();

    logger.info("Navigating...");
    const baseUrl = env.PLATFORM_BASE_URL;
    const coursePath = new URL(`/ou/course/oracle-database-19c-multitenant-architecture/86212/122711`, baseUrl).href
    await page.goto(coursePath, { waitUntil: "domcontentloaded" });

    logger.info("Waiting 20 seconds for SPA...");
    await page.waitForTimeout(20000);

    logger.info("Analyzing DOM...");

    // Dump iframe src attributes
    const iframes = await page.locator("iframe").all();
    logger.info(`Found ${iframes.length} iframes:`);
    for (let i = 0; i < iframes.length; i++) {
        logger.info(`Iframe ${i}: ${await iframes[i].getAttribute("src")}`);
    }

    const buttons = await page.evaluate(() => {
        return Array.from((document as any).querySelectorAll('button, [role="button"], a')).map((b: any) => ({
            tag: b.tagName,
            className: b.className,
            text: b.textContent?.trim().substring(0, 30)
        })).filter(b => b.className?.toLowerCase().includes('play') || (b.text && b.text.toLowerCase().includes('play')));
    });

    logger.info(`Potential play buttons: ${JSON.stringify(buttons, null, 2)}`);

    await browser.close();
})().catch(err => logger.error("Fatal error in screenshot debug script", err));
