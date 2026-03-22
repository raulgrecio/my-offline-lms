import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

import { env } from "@config/env";
import { getAuthState } from "@config/paths";

chromium.use(stealth());

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: await getAuthState() });
    const page = await context.newPage();
    
    console.log("Navigating...");
    const baseUrl = env.PLATFORM_BASE_URL;
    const coursePath = new URL(`/ou/course/oracle-database-19c-multitenant-architecture/86212/122711`, baseUrl).href
    await page.goto(coursePath, { waitUntil: "domcontentloaded" });
    
    console.log("Waiting 20 seconds for SPA...");
    await page.waitForTimeout(20000); 
    
    console.log("Analyzing DOM...");
    
    // Dump iframe src attributes
    const iframes = await page.locator("iframe").all();
    console.log(`Found ${iframes.length} iframes:`);
    for (let i = 0; i < iframes.length; i++) {
        console.log(`Iframe ${i}: ${await iframes[i].getAttribute("src")}`);
    }

    const buttons = await page.evaluate(() => {
        return Array.from((document as any).querySelectorAll('button, [role="button"], a')).map((b: any) => ({
            tag: b.tagName,
            className: b.className,
            text: b.textContent?.trim().substring(0, 30)
        })).filter(b => b.className?.toLowerCase().includes('play') || (b.text && b.text.toLowerCase().includes('play')));
    });

    console.log("Potential play buttons:", buttons);

    await browser.close();
})().catch(console.error);
