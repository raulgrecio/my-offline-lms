import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";
import { env } from "../../config/env";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  const learnerId = "124237746";
  const courseId = "146324";
  const ekitId = "ba43ef1c-645a-40ae-833f-662e98b924bb";
  
  const baseUrl = env.PLATFORM_BASE_URL;
  const viewerUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
  
  console.log(`[TEST] Navigating to: ${viewerUrl}`);
  
  page.on("response", res => {
      if(res.status() >= 400) {
          console.log(`[HTTP ERROR] ${res.status()} ${res.url()}`);
      }
  });

  await page.goto(viewerUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  
  const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
  });
  
  const content = await page.content();
  if(content.includes('Not Found') || content.includes('404')) {
       console.log("PAGE SHOWS 404!");
  } else if (iframeSrc) {
       console.log(`✅ SUCCESS! Found iframe with src: ${iframeSrc}`);
  } else {
       console.log("No 404, but no iframe either. HTML snippet:");
       console.log(content.substring(0, 500));
  }
  
  await browser.close();
}
run().catch(console.error);
