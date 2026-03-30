/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import HomepageHero from "@components/HomepageHero.astro";

describe("HomepageHero.astro", () => {
  it("should render welcome message when no last watched", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(HomepageHero, { props: {} });
    expect(html).toContain('Bienvenido de nuevo');
    expect(html).toContain('Explorar cursos');
  });

  it("should render continuation message when last watched is provided", async () => {
    const container = await createTestContainer();
    const lastWatched = { courseId: 'c1', metadata: { name: 'Video lesson 1' } };
    const lastWatchedCourse = { title: 'AI Mastery' };

    const html = await container.renderToString(HomepageHero, {
      props: { lastWatched, lastWatchedCourse }
    });
    expect(html).toContain('Continuar viendo');
    expect(html).toContain('Video lesson 1');
    expect(html).toContain('AI Mastery');
  });
});
