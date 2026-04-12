/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../../utils/test-render";
// @ts-ignore
import SaveIndicator from "@web/ui/modules/pdf-viewer/SaveIndicator.astro";

describe("SaveIndicator.astro", () => {
  it("should render SaveIndicator with initial hidden state", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(SaveIndicator);
    
    expect(html).toContain('id="save-indicator"');
    expect(html).toContain('Progreso guardado');
    expect(html).toContain('opacity-0');
  });
});
