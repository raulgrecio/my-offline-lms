/** @vitest-environment node */
import { describe, it, expect, vi } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import Layout from "@web/layouts/MainLayout.astro";

describe("MainLayout.astro", () => {
  it("should render title and content", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Layout, {
      props: { title: 'Test Page' },
      slots: { default: '<div id="test-content">Main Content</div>' }
    });

    expect(html).toContain('Test Page — Offline LMS');
    expect(html).toContain('Main Content');
    expect(html).toContain('Offline LMS');
    expect(html).toContain('<html lang="es">');
  });

  it("should include navigation links", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Layout, {
      props: { title: 'Nav Test' }
    });

    expect(html).toContain('Inicio');
    expect(html).toContain('Learning Paths');
    expect(html).toContain('Cursos');
    expect(html).toContain('Ajustes');
  });

  it("should render meta description", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Layout, {
      props: { title: 'Meta Test', description: 'Custom description' }
    });

    expect(html).toContain('name="description" content="Custom description"');
  });
});
