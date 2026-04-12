/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../../utils/test-render";
// @ts-ignore
import Viewer from "@web/ui/modules/pdf-viewer/Viewer.astro";

describe("Viewer.astro", () => {
  it("should render Viewer (Root) with children and data attributes", async () => {
    const container = await createTestContainer();
    const testProps = {
      assetId: "asset_123",
      courseId: "course_456",
      path: "/assets/test.pdf",
      initialPage: 1
    };
    
    const html = await container.renderToString(Viewer, {
      props: testProps
    });
    
    expect(html).toContain('id="viewer-root"');
    expect(html).toContain('data-asset-id="asset_123"');
    expect(html).toContain('data-course-id="course_456"');
    expect(html).toContain('data-path="/assets/test.pdf"');
    expect(html).toContain('id="pdf-sidebar"');
    expect(html).toContain('id="pdf-container"');
    expect(html).toContain('id="save-indicator"');
  });
});
