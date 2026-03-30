import { chromium } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { NodeFileSystem, NodePath } from "@my-offline-lms/core/filesystem";
import { CASES } from "./auditCases";

const fs = new NodeFileSystem();
const path = new NodePath();

const AUDIT_DIR = "debug/audits";

function padAndCenter(src: PNG, width: number, height: number): PNG {
  const result = new PNG({ width, height, fill: true });
  for (let i = 0; i < result.data.length; i++) result.data[i] = 0;
  const xOff = Math.floor((width - src.width) / 2);
  const yOff = Math.floor((height - src.height) / 2);
  for (let sy = 0; sy < src.height; sy++) {
    for (let sx = 0; sx < src.width; sx++) {
      const srcIdx = (sy * src.width + sx) * 4;
      const dstIdx = ((yOff + sy) * width + (xOff + sx)) * 4;
      for (let c = 0; c < 4; c++) result.data[dstIdx + c] = src.data[srcIdx + c];
    }
  }
  return result;
}

async function performCapture(context: any, url: string, selector: string, state: string, legacy?: any): Promise<Buffer> {
  const page = await context.newPage();
  try {
    // Global style to disable transitions/animations
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.innerHTML = `*, *::before, *::after { transition: none !important; animation: none !important; }`;
      document.head.appendChild(style);
    });

    await page.goto(url, { waitUntil: "networkidle" });

    // If we want legacy, inyect it BEFORE any interaction
    if (legacy) {
      await page.evaluate(({ sel, leg, s }: { sel: string, leg: any, s: string }) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const legacyEl = document.createElement(leg.tag || 'button');
        legacyEl.id = 'target-item';

        // Base styles
        const style = legacyEl.style;
        style.display = "inline-flex";
        style.alignItems = "center";
        style.gap = "8px";
        style.padding = "8px 16px";
        style.borderRadius = "8px";
        style.fontSize = "12px";
        style.fontWeight = "500";
        style.cursor = "pointer";
        style.border = "1px solid rgba(255, 255, 255, 0.1)";
        style.background = "transparent";
        style.color = "#a0aec0";
        style.lineHeight = "1";
        style.transition = "none";

        // Apply state-specific styles directly during injection (Theme-aware)
        if (s === "hover") {
          style.backgroundColor = "var(--color-brand-600, #c74634)88"; // 8% opacity fallback
          style.color = "var(--color-text-primary)";
          style.borderColor = "var(--color-brand-600)";
          style.filter = "brightness(1.1)";
        }
        if (s === "active") {
          style.backgroundColor = "var(--color-brand-600, #c74634)22"; // Just a hint more
          style.transform = "scale(0.98)";
        }

        if (leg.innerHTML) legacyEl.innerHTML = leg.innerHTML;
        el.replaceWith(legacyEl);
      }, { sel: selector, leg: legacy, s: state });
    }

    const targetSelector = legacy ? '#target-item' : selector;
    const locator = page.locator(targetSelector).first();
    await locator.waitFor({ state: "visible", timeout: 3000 });

    // Interactions from a clean mouse state
    await page.mouse.move(0, 0);

    if (state === "hover") {
      await locator.evaluate((el: HTMLElement) => {
        (el as HTMLElement).style.setProperty("background-color", "var(--color-surface-800)", "important");
        (el as HTMLElement).style.setProperty("color", "var(--color-brand-400)", "important");
        (el as HTMLElement).style.setProperty("border-color", "var(--color-brand-500)", "important");
      });
      await locator.hover();
      await page.waitForTimeout(100);
    }
    if (state === "active") {
      await locator.evaluate((el: HTMLElement) => {
        (el as HTMLElement).style.setProperty("background-color", "var(--color-surface-700)", "important");
        (el as HTMLElement).style.setProperty("transform", "scale(0.95)", "important");
      });
      await locator.hover();
      await page.mouse.down();
      await page.waitForTimeout(100);
    }

    const buffer = await locator.screenshot();
    return buffer;
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    baseURL: "http://localhost:4321",
  });

  for (const auditCase of CASES) {
    console.log(`Auditing Component: ${auditCase.componentName}`);

    for (const caseVariant of auditCase.cases) {
      console.log(`  🔍 Caso: ${caseVariant.name}`);

      const states = auditCase.states || ["normal", "hover", "active"];

      for (const state of states) {
        console.log(`    📷 Estado: ${state}`);
        const targetDir = path.join(AUDIT_DIR, auditCase.componentName, caseVariant.name, state);
        await fs.mkdir(targetDir, { recursive: true });

        try {
          // 1. Capture Modern (Current) - ATOMIC
          const currentBuffer = await performCapture(context, caseVariant.url, auditCase.selector, state);
          await fs.writeFile(path.join(targetDir, "current.png"), currentBuffer);

          // 2. Capture Legacy (Baseline) - ATOMIC
          const baselineBuffer = await performCapture(context, caseVariant.url, auditCase.selector, state, caseVariant.legacy);
          await fs.writeFile(path.join(targetDir, "baseline.png"), baselineBuffer);

          // 3. Diff
          const bImg = PNG.sync.read(baselineBuffer);
          const cImg = PNG.sync.read(currentBuffer);
          const w = Math.max(bImg.width, cImg.width);
          const h = Math.max(bImg.height, cImg.height);
          const paddedB = padAndCenter(bImg, w, h);
          const paddedC = padAndCenter(cImg, w, h);
          const diff = new PNG({ width: w, height: h });
          pixelmatch(paddedB.data, paddedC.data, diff.data, w, h, { threshold: 0.1 });
          await fs.writeFile(path.join(targetDir, "diff.png"), PNG.sync.write(diff));

        } catch (err: any) {
          console.error(`[ERROR] ${state} failed:`, err.message);
        }
      }
    }
  }
  await browser.close();
  console.log("[FINISH] Audit complete.");
}

main().catch(console.error);
