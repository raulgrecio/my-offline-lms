import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";
import { env } from "../../config/env";

chromium.use(stealth());

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: path.resolve('data/.auth/state.json') });
  const page = await context.newPage();
  
  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
 
  await page.goto(courseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  
  const iframeElement = await page.waitForSelector("#ekitIframe", { timeout: 30000 });
  const iframeSrc = await iframeElement?.getAttribute("src");
  
  if (iframeSrc) {
      const configUrl = iframeSrc.replace("index.html", "javascript/config.js");
      console.log("Fetching config.js:", configUrl);
      
      const configObjContent = await page.evaluate(async (url) => {
          const res = await fetch(url);
          return await res.text();
      }, configUrl);
      
      console.log("================ CONFIG.JS ================");
      console.log(configObjContent.substring(0, 1000));
      console.log("...");
      
      // Match page count
      const match = configObjContent.match(/totalPageCount\s*[:=]\s*(\d+)/i);
      if (match) {
          console.log("Total Pages Found:", match[1]);
      } else {
          console.log("Could not parse totalPageCount via regex");
      }
      
      // Look for flipbook config object name
      const varMatch = configObjContent.match(/var\s+([a-zA-Z0-9_]+)\s*=\s*\{/);
      if (varMatch) {
          console.log("Main config variable might be:", varMatch[1]);
      }
  }
  
  await browser.close();
}
run().catch(console.error);
