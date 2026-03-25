/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import CollapsibleCard from "../../src/components/CollapsibleCard.astro";

describe("CollapsibleCard.astro", () => {
  it("should render title and icon", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CollapsibleCard, {
      props: { title: 'Test Title', icon: 'plus' },
      slots: { default: 'Test Content' }
    });

    expect(html).toContain('Test Title');
    expect(html).toContain('Test Content');
    // Should have data-collapsible attribute
    expect(html).toContain('data-collapsible');
    expect(html).toContain('data-collapsible-trigger');
  });

  it("should render with subtitle", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CollapsibleCard, {
      props: { title: 'Parent', subtitle: 'Child info' }
    });
    expect(html).toContain('Parent');
    expect(html).toContain('Child info');
  });

  it("should be initially closed by default", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CollapsibleCard, {
      props: { title: 'Closed' }
    });
    // Check for "hidden" class on the content container
    const contentDivAttributes = html.split('data-collapsible-content')[0].split('<div').pop() || '';
    expect(contentDivAttributes).toContain('hidden');
    // aria-expanded should be false
    expect(html).toContain('aria-expanded="false"');
  });

  it("should be initially open if prop is set", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CollapsibleCard, {
      props: { title: 'Open', initialOpen: true }
    });
    // Should NOT have hidden class on the content container
    const contentDivAttributes = html.split('data-collapsible-content')[0].split('<div').pop() || '';
    expect(contentDivAttributes).not.toContain('hidden');
    // aria-expanded should be true
    expect(html).toContain('aria-expanded="true"');
    // icon should have rotate class
    expect(html).toContain('rotate-180');
  });
});
