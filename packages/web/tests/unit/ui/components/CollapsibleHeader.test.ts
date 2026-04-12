/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import CollapsibleHeader from "@web/ui/components/CollapsibleHeader.astro";

describe("CollapsibleHeader.astro", () => {
  it("should render title and subtitle", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CollapsibleHeader, {
      props: { 
        title: "Main Title",
        subtitle: "Sub Title",
        icon: "book"
      }
    });

    expect(html).toContain("Main Title");
    expect(html).toContain("Sub Title");
  });

  it("should render the icon", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CollapsibleHeader, {
      props: { 
        title: "Title",
        subtitle: "Subtitle",
        icon: "home"
      }
    });

    expect(html).toContain('<svg');
    expect(html).toContain('role="img"');
  });
});
