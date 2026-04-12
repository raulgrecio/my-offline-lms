/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import InfoCard from "@web/ui/components/InfoCard.astro";

describe("InfoCard.astro", () => {
  it("should render title and slot content", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(InfoCard, {
      props: { 
        title: "Information",
        icon: "info"
      },
      slots: { default: "Detailed info text" }
    });

    expect(html).toContain("Information");
    expect(html).toContain("Detailed info text");
  });

  it("should apply variant classes correctly", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(InfoCard, {
      props: { 
        title: "Success",
        icon: "check",
        variant: "completed"
      }
    });

    expect(html).toContain("bg-status-completed/10");
    expect(html).toContain("text-status-completed");
    expect(html).toContain('role="img"');
  });
});
