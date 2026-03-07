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
  
  // Also log network requests in case the new tab doesn't trigger but an iframe does
  page.on("request", req => {
      const url = req.url();
      if(url.includes("ekit") || url.includes("pdf") || url.includes("viewer")) {
          console.log(`[NETWORK] ${req.method()} ${url}`);
      }
  });

  context.on('page', async newPage => {
      console.log(`\n[NEW TAB DETECTED!] URL: ${newPage.url()}`);
      await newPage.waitForLoadState('domcontentloaded');
      console.log(`[NEW TAB LOADED] URL: ${newPage.url()}`);
      await newPage.screenshot({ path: "/tmp/guide_viewer_tab.png" });
      
      const content = await newPage.content();
      fs.writeFileSync('/tmp/guide_viewer.html', content);
      console.log(`[NEW TAB] Wrote HTML to /tmp/guide_viewer.html`);
  });

  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
  console.log("Navigating to course page:", courseUrl);
  await page.goto(courseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  
  console.log("Waiting 10s for UI render...");
  await page.waitForTimeout(10000); 
  
  const guidesTab = await page.getByText("Guides", { exact: true }).first();
  if (guidesTab) {
    console.log("Found guides tab, clicking...");
    await guidesTab.click();
    await page.waitForTimeout(5000); 
    
    // Find the guide item and click the eye icon. 
    // In the screenshot, each guide is a row with an eye icon.
    // Let's find any button or link inside the container that has the text "Student Guide"
    console.log("Looking for guide row...");
    const guideCards = await page.locator(':has-text("Student Guide")').all();
    console.log(`Found ${guideCards.length} elements containing 'Student Guide'`);
    
    // The most reliable way is often to click on an svg/icon or the rightmost part, or just click the whole row.
    // Wait, the eye icon might just be an SVG or font icon. Let's try locating any SVG inside the first guide element's parent.
    const success = await page.evaluate(() => {
        // Find the div that contains "Student Guide"
        const spans = Array.from(document.querySelectorAll('span, div, p'));
        const guideTitle = spans.find(span => span.textContent?.trim() === 'Oracle AI Database: Deploy, Patch, and Upgrade Workshop (Student Guide)');
        if (guideTitle) {
            // Find the closest list item or row container
            let container = guideTitle.parentElement;
            while (container && !container.textContent?.includes('Activity Guide') && container.tagName !== 'LI') {
                 if (container.querySelector('i') || container.querySelector('svg')) {
                     break; 
                 }
                 container = container.parentElement;
            }
            if (container) {
                 // Find the icon/button inside
                 const icon = container.querySelector('i.icon-view') || container.querySelector('i') || container.querySelector('svg');
                 if (icon) {
                     (icon as HTMLElement).click();
                     return "Clicked Icon!";
                 } else {
                     (container as HTMLElement).click();
                     return "Clicked Container!";
                 }
            }
        }
        return "Not found using precise search";
    });
    
    console.log(`Evaluation result: ${success}`);
    
    if (success !== "Not found using precise search") {
        console.log("Waiting 15s to see if iframe or popup appears...");
        await page.waitForTimeout(15000);
        await page.screenshot({ path: "/tmp/guide_ui_3.png", fullPage: true });
        fs.writeFileSync('/tmp/course_after_click.html', await page.content());
        console.log("Screenshots and HTML saved.");
    }
  }
  
  await browser.close();
}
run().catch(console.error);
