/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import Logo from "@web/ui/primitives/Logo.astro";

describe("Logo.astro", () => {
  it("should render the SVG logo", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Logo);

    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 32 32"');
    expect(html).toContain('fill="#f83b20"');
    expect(html).toContain('<ellipse');
  });

  it("should apply pixel size when passed as a number", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Logo, {
      props: { size: 48 }
    });

    // Astro might render style as an object or string depending on version/renderer
    // but usually it's style="width: 48px; height: 48px;"
    expect(html).toContain('48px');
  });

  it("should apply tailwind classes when passed as a string", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Logo, {
      props: { size: "w-12 h-12" }
    });

    expect(html).toContain('w-12 h-12');
  });

  it("should merge custom className", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Logo, {
      props: { className: "custom-logo-class" }
    });

    expect(html).toContain("custom-logo-class");
  });
});
