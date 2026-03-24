/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import FavoriteButton from "../../src/components/FavoriteButton.astro";

describe("FavoriteButton.astro", () => {
  it("should render with correct data attributes", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(FavoriteButton, {
      props: { id: 'item1', type: 'course', isFavorite: true }
    });
    expect(html).toContain('data-id="item1"');
    expect(html).toContain('data-type="course"');
    expect(html).toContain('data-is-favorite="true"');
    expect(html).toContain('aria-pressed="true"');
  });

  it("should support different sizes", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(FavoriteButton, {
      props: { id: 'item1', type: 'course', size: 'lg' }
    });
    expect(html).toContain('p-2.5'); // lg size maps to p-2.5
  });

  it("should support different hover effects", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(FavoriteButton, {
      props: { id: 'item1', type: 'course', hoverEffect: 'translate' }
    });
    expect(html).toContain('hover:-translate-y-px');
  });
});
