/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
// @ts-ignore
import ProgressBar from "@web/components/ProgressBar.astro";

describe("ProgressBar.astro", () => {
  it("should render with correct width", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProgressBar, { props: { progress: 75 } });
    expect(html).toContain('width: 75%');
  });
});
