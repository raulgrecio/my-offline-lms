/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import CollapsibleCard from "@web/components/CollapsibleCard.astro";

describe("CollapsibleCard.astro", () => {
  it("should render header and content slots", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CollapsibleCard, {
      slots: {
        header: '<span id="header-slot">Test Header</span>',
        default: '<div id="content-slot">Test Content</div>'
      }
    });

    expect(html).toContain('id="header-slot"');
    expect(html).toContain('Test Header');
    expect(html).toContain('id="content-slot"');
    expect(html).toContain('Test Content');
    // Should have generic core attributes
    expect(html).toContain('data-collapsible');
    expect(html).toContain('data-collapsible-trigger');
  });

  it("should be initially closed by default", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CollapsibleCard, {
      slots: { default: 'Content' }
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
      props: { initialOpen: true },
      slots: { default: 'Content' }
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
