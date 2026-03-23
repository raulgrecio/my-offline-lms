import { test, expect } from "@playwright/test";
import { logger } from "@/platform/logging";

test.describe("Video Player and PDF Viewer", () => {
  test("should interact with Video Player and PDF Viewer across available courses", async ({ page }) => {
    await page.goto("/");

    // Get all course links
    const courseLinks = await page.locator("a[href^='/courses/']").all();

    let foundVideo = false;
    let foundPdf = false;

    for (const link of courseLinks) {
      if (foundVideo && foundPdf) break;

      await link.click();
      await page.waitForLoadState("networkidle");

      // Check for video
      if (!foundVideo) {
        const video = page.locator("video").first();
        if (await video.isVisible()) {
          logger.info(`Testing video in course: ${await page.url()}`);
          const playPauseBtn = page.getByRole("button", { name: /Reproducir|Pausar/i }).first();
          await expect(playPauseBtn).toBeVisible();

          const initialState = await video.evaluate((v: HTMLVideoElement) => v.paused);
          await playPauseBtn.click();
          await page.waitForTimeout(500);
          const newState = await video.evaluate((v: HTMLVideoElement) => v.paused);
          expect(newState).not.toBe(initialState);

          foundVideo = true;
        }
      }

      // Check for PDF
      if (!foundPdf) {
        const pdfAsset = page.locator("a[href*='viewer']").first();
        if (await pdfAsset.isVisible()) {
          logger.info(`Testing PDF in course: ${await page.url()}`);

          // Wait for the new tab
          const [newPage] = await Promise.all([
            page.waitForEvent('popup'),
            pdfAsset.click(),
          ]);

          await newPage.waitForLoadState("networkidle");

          await expect(newPage).toHaveURL(/viewer/);
          await expect(newPage.locator("#btn-zoom-in")).toBeVisible();

          const initialZoom = await newPage.locator("#zoom-input").inputValue();
          await newPage.locator("#btn-zoom-in").click();
          const newZoom = await newPage.locator("#zoom-input").inputValue();
          expect(newZoom).not.toBe(initialZoom);

          foundPdf = true;
          await newPage.close();
          // Go back to course list for searching next asset type if needed
          await page.goto("/");
          continue;
        }
      }

      // Go back to course list to try next link
      await page.goto("/");
    }

    expect(foundVideo || foundPdf).toBe(true);
  });
});
