/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import ViewerLayout from "@web/layouts/ViewerLayout.astro";

describe("ViewerLayout.astro", () => {
  it("should render title and content", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerLayout, {
      props: { title: 'Viewer Page' },
      slots: { default: '<div id="viewer-content">Video Player</div>' }
    });

    expect(html).toContain('Viewer Page — Offline LMS');
    expect(html).toContain('Video Player');
    expect(html).toContain('<html lang="es" class="h-full">');
    expect(html).toContain('bg-surface-950');
  });

  it("should include theme script and meta for mobile", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(ViewerLayout, {
      props: { title: 'Viewer' }
    });

    expect(html).toContain('localStorage.getItem("theme")');
    expect(html).toContain('user-scalable=no');
  });
});
