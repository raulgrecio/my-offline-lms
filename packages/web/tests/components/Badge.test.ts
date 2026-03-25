/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
// @ts-ignore
import Badge from "@components/Badge.astro";

describe("Badge.astro", () => {
  it("should render with all variants and dot types for coverage", async () => {
    const container = await AstroContainer.create();

    // Test variants
    const variants = ['brand', 'completed', 'in-progress', 'not-started', 'failed', 'downloading', 'neutral'] as const;
    const dots = ['none', 'static', 'pulse'] as const;

    for (const variant of variants) {
      for (const dot of dots) {
        const html = await container.renderToString(Badge, {
          props: { variant, dot, pulse: variant === 'downloading' },
          slots: { default: 'Test Badge' }
        });

        expect(html).toContain('Test Badge');
        expect(html).toContain('span');

        if (variant === 'failed' && dot !== 'none') {
          expect(html).toContain('svg');
        }

        if (variant === 'downloading' && dot !== 'none') {
          expect(html).toContain('animate-spin');
        }

        if (dot === 'pulse' && variant !== 'failed' && variant !== 'downloading') {
          expect(html).toContain('after:animate-ping');
        }
      }
    }
  });

  it("should default to neutral for unknown variants", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Badge, {
      props: { variant: 'unknown' as any }
    });
    expect(html).toContain('bg-surface-800'); // Neutral color class
  });
});
