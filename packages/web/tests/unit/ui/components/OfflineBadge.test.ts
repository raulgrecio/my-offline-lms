/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import OfflineBadge from "@web/ui/components/OfflineBadge.astro";

describe("OfflineBadge.astro", () => {
  it("should render the badge with 'Local' text", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(OfflineBadge);

    expect(html).toContain("Local");
    expect(html).toContain("bg-status-completed/10");
    expect(html).toContain('role="img"');
  });

  it("should apply custom className", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(OfflineBadge, {
      props: { className: "custom-badge-class" }
    });

    expect(html).toContain("custom-badge-class");
  });
});
