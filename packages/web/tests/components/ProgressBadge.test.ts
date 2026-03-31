/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
// @ts-ignore
import ProgressBadge from "@web/components/ProgressBadge.astro";

describe("ProgressBadge.astro", () => {
  it("should render all progress statuses with correct accessibility attributes", async () => {
    const container = await AstroContainer.create();
    const statuses = ['completed', 'in_progress', 'not_started'] as const;

    for (const status of statuses) {
      const html = await container.renderToString(ProgressBadge, { props: { status } });
      
      expect(html).toContain(`data-status="${status}"`);
      expect(html).toContain('aria-label="Estado:');

      if (status === 'completed') expect(html).toContain('Completado');
      if (status === 'in_progress') expect(html).toContain('En progreso');
      if (status === 'not_started') expect(html).toContain('Sin iniciar');
    }
  });

  it("should handle mixed case statuses", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProgressBadge, { props: { status: 'COMPLETED' as any } });
    expect(html).toContain('data-status="completed"');
    expect(html).toContain('Completado');
  });

  it("should default to not_started for unknown status", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProgressBadge, { props: { status: 'unknown' as any} });
    expect(html).toContain('data-status="not_started"');
  });
});
