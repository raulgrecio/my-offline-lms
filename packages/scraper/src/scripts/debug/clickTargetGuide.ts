import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";
import fs from "fs";

import { env } from "@config/env";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  context.on('page', async newPage => {
      console.log(`\n[NEW TAB OPENED] ${newPage.url()}`);
      await newPage.waitForLoadState('domcontentloaded');
      console.log(`[NEW TAB LOADED] ${newPage.url()}`);
      fs.writeFileSync('/tmp/guide_tab.html', await newPage.content());
      await newPage.screenshot({ path: "/tmp/guide_tab.png", fullPage: true });
  });

  page.on("request", req => {
      const url = req.url();
      if(url.includes("pdf") || url.includes("ekit") || url.includes("brm-materials") || url.includes("viewer") || url.includes("htmlViewer")) {
          console.log(`[NETWORK CAPTURE] ${req.method()} ${url}`);
      }
  });

  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href; 
  console.log("Navigating to course page:", courseUrl);
  await page.goto(courseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000); 
  
  const guidesTab = await page.getByText("Guides", { exact: true }).first();
  if (guidesTab) {
    console.log("Found guides tab, clicking...");
    await guidesTab.click();
    await page.waitForTimeout(5000); 
    
    // We know the id is 234127 from the intercepted JSON!
    const btnSelector = '#guide-btn-234127 button';
    
    const elements = await page.$$(btnSelector);
    if (elements.length > 0) {
        console.log(`Found explicit button ${btnSelector}. Clicking!`);
        await page.click(btnSelector);
        
        console.log("Waiting 15 seconds to observe network/DOM changes...");
        await page.waitForTimeout(15000);
        
        // Take a screenshot to see if it opened a modal IN THE SAME PAGE
        await page.screenshot({ path: "/tmp/guide_ui_clicked.png", fullPage: true });
        
        // Dump potential iframes in the current page
        const iframeSrcs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('iframe')).map(i => i.src);
        });
        console.log(`Current page iframes after click: `, iframeSrcs);
        
        fs.writeFileSync('/tmp/course_after_precise_click.html', await page.content());
        console.log("Saved screenshots and state.");
    } else {
        console.log(`Could not find button ${btnSelector}.`);
    }
  }
  
  await browser.close();
}
run().catch(console.error);
