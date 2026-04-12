/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../../utils/test-render";
// @ts-ignore
import ViewerSidebar from "@web/ui/modules/pdf-viewer/ViewerSidebar.astro";

describe("ViewerSidebar.astro", () => {
  it("should render ViewerSidebar with thumbnails container", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerSidebar);
    
    expect(html).toContain('id="pdf-sidebar"');
    expect(html).toContain('id="thumbnails-container"');
    expect(html).toContain('id="thumb-template"');
  });
});
