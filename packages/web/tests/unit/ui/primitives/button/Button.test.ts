/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../../utils/test-render";
// @ts-ignore
import Button from "@web/ui/primitives/button/Button.astro";

describe("Button (Primitive Astro)", () => {
  it("should render content", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Button, {
      slots: { default: "Astro Button" }
    });

    expect(html).toContain("Astro Button");
  });

  it("should render as an anchor when href is provided", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Button, {
      props: { href: "/test" },
      slots: { default: "Link" }
    });

    expect(html).toContain('<a');
    expect(html).toContain('href="/test"');
  });

  it("should render as a button by default", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Button, {
      slots: { default: "Button" }
    });

    expect(html).toContain('<button');
  });
});
