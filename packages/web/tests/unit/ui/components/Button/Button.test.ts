/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../../utils/test-render";
// @ts-ignore
import Button from "@web/ui/components/Button/Button.astro";

describe("Button (Component Astro)", () => {
  it("should render with icon", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Button, {
      props: {
        icon: "home"
      },
      slots: {
        default: "Text"
      }
    });

    expect(html).toContain("Text");
    expect(html).toContain('<svg');
  });

  it("should render with different variants", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(Button, {
      props: { variant: "outline" },
      slots: { default: "Outline" }
    });

    expect(html).toContain("Outline");
  });
});
