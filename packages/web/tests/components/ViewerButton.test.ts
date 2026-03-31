/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import ViewerButton from "@web/components/PDFViewer/ViewerButton.astro";

describe("ViewerButton.astro", () => {
  it("should render as a button by default", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerButton, {
      props: { title: "Test Button", icon: "plus" }
    });

    expect(html).toContain('<button');
    expect(html).toContain('title="Test Button"');
    expect(html).toContain('svg'); // Icon should be present
  });

  it("should render as an anchor if href is provided", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerButton, {
      props: { title: "Test Link", icon: "external-link", href: "https://example.com" }
    });

    expect(html).toContain('<a');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('title="Test Link"');
  });

  it("should apply variant classes correctly", async () => {
    const container = await createTestContainer();

    const ghostHtml = await container.renderToString(ViewerButton, {
      props: { title: "Ghost", icon: "plus", variant: "ghost" }
    });
    expect(ghostHtml).toContain('w-11 h-11');

    const zoomHtml = await container.renderToString(ViewerButton, {
      props: { title: "Zoom", icon: "plus", variant: "zoom" }
    });
    expect(zoomHtml).toContain('!h-auto !w-auto');
  });

  it("should preserve extra attributes like onclick or id", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerButton, {
      props: {
        title: "Action",
        icon: "plus",
        id: "unique-id",
        onclick: "alert('hi')"
      }
    });

    expect(html).toContain('id="unique-id"');
    expect(html).toContain('onclick="alert(\'hi\')"');
  });
});
