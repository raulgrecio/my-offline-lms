/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../../utils/test-render";
// @ts-ignore
import ViewerMain from "@web/ui/modules/pdf-viewer/ViewerMain.astro";

describe("ViewerMain.astro", () => {
  it("should render ViewerMain with containers and templates", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerMain);
    
    expect(html).toContain('id="pdf-container"');
    expect(html).toContain('id="loading"');
    expect(html).toContain('id="page-template"');
    expect(html).toContain('id="error-template"');
    expect(html).toContain('id="help-template"');
  });
});
