/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import CourseCard from "@web/components/CourseCard.astro";

describe("CourseCard.astro", () => {
  it("should render title and basic info", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CourseCard, {
      props: { id: 'c1', title: 'Test Course', totalAssets: 5, progress: 20 }
    });
    expect(html).toContain('Test Course');
    expect(html).toContain('5 recursos');
    expect(html).toContain('20%');
    expect(html).toContain('href="/courses/c1"');
  });

  it("should render order index if provided", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CourseCard, {
      props: { id: 'c1', title: 'Test Course', orderIndex: 42 }
    });
    expect(html).toContain('42');
  });

  it("should render default icon if order index is missing", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(CourseCard, {
      props: { id: 'c1', title: 'Test Course' }
    });
    expect(html).toContain('svg'); // Book-open icon
  });
});
