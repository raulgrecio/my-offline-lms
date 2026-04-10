/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import Viewer from "@web/components/PDFViewer/Viewer.astro";
// @ts-ignore
import ViewerHeader from "@web/components/PDFViewer/ViewerHeader.astro";
// @ts-ignore
import ViewerMain from "@web/components/PDFViewer/ViewerMain.astro";
// @ts-ignore
import ViewerSidebar from "@web/components/PDFViewer/ViewerSidebar.astro";
// @ts-ignore
import SaveIndicator from "@web/components/PDFViewer/SaveIndicator.astro";

describe("PDFViewer Astro Components", () => {
  it("should render SaveIndicator with initial hidden state", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(SaveIndicator);
    
    expect(html).toContain('id="save-indicator"');
    expect(html).toContain('Progreso guardado');
    expect(html).toContain('opacity-0');
  });

  it("should render ViewerSidebar with thumbnails container", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerSidebar);
    
    expect(html).toContain('id="pdf-sidebar"');
    expect(html).toContain('id="thumbnails-container"');
    expect(html).toContain('id="thumb-template"');
  });

  it("should render ViewerHeader with path and controls", async () => {
    const container = await createTestContainer();
    const testPath = "/assets/test.pdf";
    const html = await container.renderToString(ViewerHeader, {
      props: { path: testPath }
    });
    
    expect(html).toContain('id="pdf-title"');
    expect(html).toContain('id="page-input"');
    expect(html).toContain('id="total-pages"');
    expect(html).toContain('id="btn-zoom-in"');
    expect(html).toContain('id="btn-zoom-out"');
    expect(html).toContain(`href="${testPath}"`);
  });

  it("should render ViewerMain with containers and templates", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerMain);
    
    expect(html).toContain('id="pdf-container"');
    expect(html).toContain('id="loading"');
    expect(html).toContain('id="page-template"');
    expect(html).toContain('id="error-template"');
    expect(html).toContain('id="help-template"');
  });

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
