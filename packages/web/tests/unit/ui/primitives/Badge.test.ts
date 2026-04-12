/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
// @ts-ignore
import Badge from "@web/ui/primitives/Badge.astro";

describe("Badge.astro", () => {
  it("should render with accessibility attributes", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Badge, {
      props: { 
        ariaLabel: "Test Status",
        dataStatus: "custom-state"
      }
    });

    expect(html).toContain('aria-label="Test Status"');
    expect(html).toContain('data-status="custom-state"');
    expect(html).toContain('role="status"');
  });

  it("should render all dot types correctly", async () => {
    const container = await AstroContainer.create();
    const dots = ['none', 'static', 'pulse'] as const;

    for (const dot of dots) {
      const html = await container.renderToString(Badge, {
        props: { dot },
        slots: { default: 'Content' }
      });

      if (dot === 'none') {
        expect(html).not.toContain('w-1.5 h-1.5');
      } else {
        expect(html).toContain('w-1.5 h-1.5');
        if (dot === 'pulse') {
          expect(html).toContain('after:animate-ping');
        }
      }
    }
  });

  it("should prioritize custom dot slot", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Badge, {
      slots: { 
        dot: '<span id="icon"></span>',
        default: 'Content' 
      }
    });
    expect(html).toContain('id="icon"');
    expect(html).not.toContain('w-1.5 h-1.5'); // Default dot is gone
  });
});
