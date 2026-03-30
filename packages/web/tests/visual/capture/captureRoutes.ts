import { chromium } from "@playwright/test";
import { NodeFileSystem, NodePath } from "@my-offline-lms/core/filesystem";

const BASE_URL = "http://localhost:4321";
const fs = new NodeFileSystem();
const path = new NodePath();

export async function captureScreenshots(
  routes: string[],
  mode: "baseline" | "current",
  force: boolean = false
) {
  const browser = await chromium.launch();

  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: 800,
    },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Inject CSS to disable animations and transitions for deterministic screenshots
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  });

  for (const route of routes) {
    const url = BASE_URL + route;

    console.log(`capturing ${mode}: ${route}`);

    try {
      await page.goto(url, { waitUntil: "networkidle" });

      const fileName = routeToFileName(route);
      const outputPath = path.join(
        "debug",
        mode,
        "pages",
        fileName
      );

      // Create directory using internal FS abstraction
      const dirPath = path.dirname(outputPath);
      if (!(await fs.exists(dirPath))) {
        await fs.mkdir(dirPath, { recursive: true });
      }

      if (await fs.exists(outputPath) && !force) {
        console.log(`skipping ${mode}: ${route} (already exists)`);
        continue;
      }

      await page.screenshot({
        path: outputPath,
        fullPage: true,
      });

    } catch (err) {
      console.error(`failed to capture ${route}:`, err);
    }
  }

  await browser.close();
}

function routeToFileName(route: string) {
  if (route === "/") return "home.png";

  return (
    route
      .replace(/\//g, "-")
      .replace(/^-/, "") + ".png"
  );
}
