/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import ProgressSegments from "@web/components/PDFViewer/ProgressSegments.astro";

describe("ProgressSegments.astro", () => {
  it("should render with the required container ID for JS integration", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ProgressSegments);

    // Critical ID for pdf-viewer-client.ts
    expect(html).toContain('id="pdf-segments-container"');

    // Accessibility
    expect(html).toContain('aria-hidden="true"');
  });

  it("should contain standard layout classes", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ProgressSegments);

    expect(html).toContain('w-full');
    expect(html).toContain('h-0.5');
    expect(html).toContain('flex');
  });
});
