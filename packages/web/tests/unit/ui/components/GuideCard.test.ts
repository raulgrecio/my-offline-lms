/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../utils/test-render";
// @ts-ignore
import GuideCard from "@web/ui/components/GuideCard.astro";

describe("GuideCard.astro", () => {
  const defaultProps = {
    assetId: 'a1',
    courseId: 'c1',
    name: 'Introduction',
    localUrl: 'test.pdf',
    progress: null,
    totalPages: 10
  };

  it("should render name and basic status", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(GuideCard, { props: defaultProps });
    expect(html).toContain('Introduction');
    expect(html).toContain('Ver guía de 10 páginas');
  });

  it("should show completed status", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(GuideCard, {
      props: { ...defaultProps, progress: { completed: true, position: 10, maxPosition: 10 } }
    });
    expect(html).toContain('Completado');
    expect(html).toContain('data-is-done="true"');
  });

  it("should show continue message", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(GuideCard, {
      props: { ...defaultProps, progress: { completed: false, position: 5, maxPosition: 8 } }
    });
    expect(html).toContain('Continuar en la pág. 5 de 10');
    expect(html).toContain('(visto hasta la 8)');
  });
});
