import { chromium } from "@playwright/test";
import { NodeFileSystem, NodePath } from "@core/filesystem";
import { logger } from "../logger";

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

    logger.info(`capturing ${mode}: ${route}`);

    try {
      // Log Console showcase and Import page use SSE/Polling, which never reaches 'networkidle'
      const waitStrategy = (route.includes("log-console-showcase") || route === "/import/")
        ? "load"
        : "networkidle";

      await page.goto(url, { waitUntil: waitStrategy });

      // Inject full-page screenshot overrides after load
      await page.addStyleTag({
        content: `
          /* App-style layout overrides for full-page capture */
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
          #scroll-container {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          header#main-header {
            position: relative !important; /* Avoid sticky header overlapping everything in full-page */
          }
        `,
      });

      // Wait a moment for layout reflow
      await page.waitForTimeout(200);

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
        logger.info(`skipping ${mode}: ${route} (already exists)`);
        continue;
      }

      await page.screenshot({
        path: outputPath,
        fullPage: true,
      });

    } catch (err) {
      logger.error(`failed to capture ${route}:`, err);
    }
  }

  await browser.close();
}

export function routeToFileName(route: string) {
  if (route === "/") return "home.png";

  const normalized = route.replace(/\/$/, "");
  return (
    normalized
      .replace(/\//g, "-")
      .replace(/^-/, "") + ".png"
  );
}
