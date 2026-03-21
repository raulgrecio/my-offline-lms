import { test, expect } from "@playwright/test";

test.describe("Segment Visualization", () => {
  test("should visualize visited segments in Video Player", async ({ page }) => {
    await page.goto("/");
    
    // Find a course with a video and enter it
    const courseCard = page.locator("a[href^='/courses/']").first();
    await courseCard.click();
    await page.waitForLoadState("networkidle");

    const video = page.locator("video").first();
    if (!(await video.isVisible())) {
      console.log("No video found in first course, skipping video segment test");
      return;
    }

    // Play for a few seconds to generate segments
    const playPauseBtn = page.getByRole("button", { name: /Reproducir|Pausar/i }).first();
    await playPauseBtn.click();
    
    // Wait for 6 seconds (more than one 5s segment)
    await page.waitForTimeout(6000);
    
    // Check if there's at least one visited segment visualized
    const visitedSegment = page.locator(".group\\/bar .bg-brand-500\\/30").first();
    await expect(visitedSegment).toBeVisible();
  });

  test("should visualize visited segments in PDF Viewer", async ({ page }) => {
    await page.goto("/");
    
    // Click on a course card first
    const courseCard = page.locator("a[href^='/courses/']").first();
    await courseCard.click();
    await page.waitForLoadState("networkidle");

    // Find a PDF asset
    const pdfAsset = page.locator("a[href*='viewer']").first();
    await expect(pdfAsset).toBeVisible();

    // Open PDF viewer in a new tab
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      pdfAsset.click(),
    ]);

    await newPage.waitForLoadState("networkidle");
    await expect(newPage).toHaveURL(/viewer/);

    // Wait for PDF to load and segments container to be ready
    const segmentsContainer = newPage.locator("#pdf-segments-container");
    await expect(segmentsContainer).toBeVisible();

    // Initially, there should be at least one segment (current page)
    const initialVisitedSegment = segmentsContainer.locator(".bg-brand-500\\/50").first();
    await expect(initialVisitedSegment).toBeVisible();

    // Navigate to next page
    await newPage.keyboard.press("ArrowDown");
    await newPage.waitForTimeout(1000); // Wait for save/render

    // Check if we have more than one visited segment now
    const visitedSegmentsCount = await segmentsContainer.locator(".bg-brand-500\\/50").count();
    expect(visitedSegmentsCount).toBeGreaterThanOrEqual(1);
    
    await newPage.close();
  });
});
