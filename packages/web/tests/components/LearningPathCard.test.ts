/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import LearningPathCard from "../../src/components/LearningPathCard.astro";

describe("LearningPathCard.astro", () => {
  const defaultProps = {
    id: 'lp1',
    title: 'Mastering AI',
    description: 'A long description about mastering artificial intelligence',
    courseCount: 10,
    completedCount: 5,
    progress: 50,
    status: 'in_progress'
  };

  it("should render title, description and progress", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(LearningPathCard, { props: defaultProps });
    expect(html).toContain('Mastering AI');
    expect(html).toContain('5 / 10 cursos');
    expect(html).toContain('50%');
    expect(html).toContain('href="/learning-paths/lp1"');
  });

  it("should strip HTML from description", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(LearningPathCard, {
      props: { ...defaultProps, description: '<b>Bold</b> description' }
    });
    expect(html).toContain('Bold');
    expect(html).toContain('description');
    expect(html).not.toContain('<b>');
  });
});
