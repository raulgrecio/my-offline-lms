/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
// @ts-ignore
import AssetBadge from "@web/components/AssetBadge.astro";

describe("AssetBadge.astro", () => {
  it("should render all asset statuses with correct aria and data labels", async () => {
    const container = await AstroContainer.create();
    const statuses = ['COMPLETED', 'DOWNLOADING', 'FAILED', 'PENDING'] as const;

    for (const status of statuses) {
      const html = await container.renderToString(AssetBadge, { props: { status } });
      
      // Semantic checks
      expect(html).toContain(`data-status="${status}"`);
      expect(html).toContain('aria-label="Estado Asset:');

      if (status === 'COMPLETED') expect(html).toContain('Completado');
      if (status === 'DOWNLOADING') {
        expect(html).toContain('Descargando');
        expect(html).toContain('animate-spin');
      }
      if (status === 'FAILED') {
        expect(html).toContain('Error');
        expect(html).toContain('svg');
      }
      if (status === 'PENDING') expect(html).toContain('Pendiente');
    }
  });

  it("should handle lowercase and unknown statuses semantically", async () => {
    const container = await AstroContainer.create();
    
    const htmlLower = await container.renderToString(AssetBadge, { props: { status: 'completed' as any } });
    expect(htmlLower).toContain('data-status="COMPLETED"');

    const htmlUnknown = await container.renderToString(AssetBadge, { props: { status: 'UNKNOWN' as any } });
    expect(htmlUnknown).toContain('data-status="PENDING"'); // Default
  });
});
