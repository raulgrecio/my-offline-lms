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
  
  const baseUrl = env.PLATFORM_BASE_URL;
  const courseUrl = new URL(`/ou/course/oracle-ai-database-deploy-patch-and-upgrade-workshop/146324`, baseUrl).href;
 
  await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  
  const guidesTab = await page.$("#guides-tab");
  if (guidesTab) {
    await guidesTab.click();
    await page.waitForTimeout(5000);
  }
  
  const html = await page.content();
  fs.writeFileSync("/tmp/course_with_guides.html", html);
  console.log("Saved full HTML to /tmp/course_with_guides.html");
  
  await browser.close();
}

run().catch(console.error);
