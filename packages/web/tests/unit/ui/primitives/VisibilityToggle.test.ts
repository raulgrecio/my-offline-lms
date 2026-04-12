/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import VisibilityToggle from "@web/ui/primitives/VisibilityToggle.astro";

describe("VisibilityToggle.astro", () => {
  it("should render show all state", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VisibilityToggle, {
      props: { showAll: true, baseUrl: '/courses', targetIds: 'list' }
    });
    expect(html).toContain('Ocultar vacíos');
    expect(html).toContain('svg');
    expect(html).toContain('href="/courses?all=false"');
  });

  it("should render hide all state", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VisibilityToggle, {
      props: { showAll: false, baseUrl: '/courses', targetIds: ['list1', 'list2'] }
    });
    expect(html).toContain('Ver todos');
    expect(html).toContain('svg');
    expect(html).toContain('href="/courses"');
    expect(html).toContain('data-target-ids="list1,list2"');
  });
});
