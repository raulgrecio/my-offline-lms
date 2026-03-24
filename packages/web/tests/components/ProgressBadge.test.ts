/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
// @ts-ignore
import ProgressBadge from "@components/ProgressBadge.astro";

describe("ProgressBadge.astro", () => {
  it("should render all known statuses correctly", async () => {
    const container = await AstroContainer.create();
    const statuses = ['COMPLETED', 'IN_PROGRESS', 'NOT_STARTED', 'FAILED', 'PENDING', 'DOWNLOADING', 'UNKNOWN'] as const;

    for (const status of statuses) {
      const html = await container.renderToString(ProgressBadge, { props: { status } });
      expect(html).toContain('span');

      if (status === 'COMPLETED') expect(html).toContain('Completado');
      if (status === 'DOWNLOADING') expect(html).toContain('Descargando');
      if (status === 'UNKNOWN') expect(html).toContain('Sin iniciar');
    }
  });

  it("should handle lowercase statuses", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProgressBadge, { props: { status: 'completed' } });
    expect(html).toContain('Completado');
  });
});
