/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import EmptyState from "@web/components/EmptyState.astro";

describe("EmptyState.astro", () => {
  it("should render title, message and icon", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(EmptyState, {
      props: { title: 'No Data', message: 'There is nothing here', icon: 'inbox' }
    });
    expect(html).toContain('No Data');
    expect(html).toContain('There is nothing here');
    expect(html).toContain('svg');
  });

  it("should render without title", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(EmptyState, {
      props: { message: 'Just a message' }
    });
    expect(html).toContain('Just a message');
    expect(html).not.toContain('h2');
  });
});
