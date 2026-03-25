/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import ViewerHeader from "../../src/components/PDFViewer/ViewerHeader.astro";

describe("ViewerHeader.astro", () => {
  it("should render main navigation controls", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerHeader, {
      props: { path: "/test.pdf" }
    });
    
    expect(html).toContain('id="btn-sidebar"');
    expect(html).toContain('id="page-input"');
    expect(html).toContain('id="zoom-input"');
    expect(html).toContain('href="/test.pdf"');
  });

  it("should render content within the footer slot correctly", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerHeader, {
      props: { path: "/test.pdf" },
      slots: { 
        footer: '<div id="test-progress-bar"></div>' 
      }
    });
    
    // The injected slot should be present
    expect(html).toContain('id="test-progress-bar"');
    
    // It should be within the header
    expect(html).toContain('<header');
    expect(html).toContain('</header>');
  });
});
