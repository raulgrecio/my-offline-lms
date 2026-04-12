/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import CircularProgress from "@web/ui/primitives/CircularProgress.astro";

describe("CircularProgress.astro", () => {
  it("should render with default props", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CircularProgress, { props: { progress: 0 } });

    expect(html).toContain('viewBox="0 0 36 36"');
    expect(html).toContain('stroke-dashoffset="100"'); // 0% progress
    expect(html).toContain('w-9 h-9'); // default size md
  });

  it("should render correct progress offset", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CircularProgress, { props: { progress: 75 } });

    expect(html).toContain('stroke-dashoffset="25"'); // 100 - 75 = 25
  });

  it("should render check icon when isDone is true", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CircularProgress, { props: { isDone: true } });

    expect(html).toContain('text-brand-500'); // isDone default color
    // Since Icon is a React component rendered as static HTML, we check for its content
    expect(html).toContain('polyline'); // part of the check icon
  });

  it("should render label when not done", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CircularProgress, { props: { label: "5" } });

    // Use regex to ignore Astro source tracking data attributes
    expect(html).toMatch(/data-progress-label.*>\s*5\s*<\/div>/);
  });

  it("should apply custom color class", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CircularProgress, { props: { color: "text-status-completed" } });

    expect(html).toContain('text-status-completed');
  });

  it("should apply custom hex color style", async () => {
    const container = await createTestContainer();
    const color = "#ff0000";
    const html = await container.renderToString(CircularProgress, { props: { color } });

    expect(html).toContain(`style="color:${color}"`);
  });

  it("should handle different sizes", async () => {
    const container = await createTestContainer();

    const smHtml = await container.renderToString(CircularProgress, { props: { size: "sm" } });
    expect(smHtml).toContain('w-7 h-7');
    expect(smHtml).toContain('text-2xs');

    const lgHtml = await container.renderToString(CircularProgress, { props: { size: "lg" } });
    expect(lgHtml).toContain('w-12 h-12');
    expect(lgHtml).toContain('text-xs');
  });
});
