/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import ThemeToggle from "@web/components/ThemeToggle/ThemeToggle.astro";

describe("ThemeToggle.astro Rendering", () => {
  it("should render correctly with expected attributes and icons", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ThemeToggle);

    expect(html).toContain('data-theme-toggle');
    expect(html).toContain('aria-label="Cambiar tema"');
    expect(html).toContain('icon-sun');
    expect(html).toContain('icon-moon');
  });
});
