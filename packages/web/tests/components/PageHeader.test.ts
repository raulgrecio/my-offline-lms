/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import PageHeader from "@web/components/PageHeader.astro";

describe("PageHeader.astro", () => {
  it("should render title and icon", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(PageHeader, {
      props: { title: 'Dashboard', icon: 'home' }
    });
    expect(html).toContain('Dashboard');
    expect(html).toContain('svg');
  });

  it("should render with optional status and subtitle", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(PageHeader, {
      props: {
        title: 'Overview',
        icon: 'home',
        status: 'completed',
        subtitle: 'Overview of your progress'
      }
    });
    expect(html).toContain('Completado');
    expect(html).toContain('Overview of your progress');
  });

  it("should render actions slot", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(PageHeader, {
      props: { title: 'Dashboard', icon: 'home' },
      slots: { actions: '<button>Click Me</button>' }
    });
    expect(html).toContain('Click Me');
  });
});
