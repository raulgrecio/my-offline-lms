/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestContainer } from "../utils/test-render";

// Mocking features used in index.astro
vi.mock("@web/features/learning-paths", () => ({
  getAllLearningPaths: vi.fn().mockResolvedValue([]),
}));

vi.mock("@web/features/courses", () => ({
  getAllCourses: vi.fn().mockResolvedValue([]),
  getCourseById: vi.fn().mockResolvedValue(null),
}));

vi.mock("@web/features/progress", () => ({
  getDashboardStatus: vi.fn().mockResolvedValue({ lastWatched: null }),
  getCourseProgress: vi.fn().mockResolvedValue({ status: 'not_started', totalItems: 0, progress: 0 }),
  getLearningPathProgress: vi.fn().mockResolvedValue({ status: 'not_started', totalItems: 0, progress: 0 }),
}));

vi.mock("@web/features/favorites", () => ({
  getIsFavorite: vi.fn().mockResolvedValue(false),
}));

// @ts-ignore
import IndexPage from "../../src/pages/index.astro";
import * as learningPaths from "@web/features/learning-paths";
import * as courses from "@web/features/courses";

describe("index.astro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render empty state when no content is available", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(IndexPage);

    expect(html).toContain('Tu biblioteca está vacía');
    expect(html).toContain('Sincroniza tu cuenta para empezar');
  });

  it("should render learning paths and courses when available", async () => {
    // Setup mocks for this test
    (learningPaths.getAllLearningPaths as any).mockResolvedValue([
      { id: 'lp1', title: 'Test Path', description: 'Test Description' }
    ]);
    (courses.getAllCourses as any).mockResolvedValue([
      { id: 'c1', title: 'Test Course' }
    ]);

    const container = await createTestContainer();
    const html = await container.renderToString(IndexPage);

    expect(html).toContain('Test Path');
    expect(html).toContain('Test Course');
    expect(html).toContain('Learning Paths');
    expect(html).toContain('Cursos');
  });
});
