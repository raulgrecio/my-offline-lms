/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import Breadcrumbs from "@web/ui/components/Breadcrumbs.astro";

describe("Breadcrumbs.astro", () => {
  it("should render breadcrumb items", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Breadcrumbs, {
      props: {
        items: [
          { label: "Home", href: "/" },
          { label: "Library", href: "/library" },
          { label: "Details" },
        ],
      },
    });

    expect(html).toContain("Home");
    expect(html).toContain('href="/"');
    expect(html).toContain("Library");
    expect(html).toContain('href="/library"');
    expect(html).toContain("Details");
    // Check for chevron icons (at least 2 for 3 items)
    // The chevron-right icon points are: 9 18 15 12 9 6
    const chevronMatches = html.match(/9 18 15 12 9 6/g);
    expect(chevronMatches?.length).toBeGreaterThanOrEqual(2);
  });

  it("should render icons if provided", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Breadcrumbs, {
      props: {
        items: [
          { label: "Home", href: "/", icon: "home" },
          { label: "Details" },
        ],
      },
    });

    expect(html).toContain("Home");
    // Check for the home icon path and the chevron points
    expect(html).toContain("m3 9 9-7 9 7v11");
    expect(html).toContain("9 18 15 12 9 6");
  });

  it("should render the last item as a span", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Breadcrumbs, {
      props: {
        items: [
          { label: "Home", href: "/" },
          { label: "Details" },
        ],
      },
    });

    // We check for the specific classes used for the last item/span
    expect(html).toContain("text-text-secondary font-medium truncate");
    expect(html).toContain("Details");
  });
});
