/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import LearningPathsIndexPage from "@web/pages/learning-paths/index.astro";
// @ts-ignore
import LearningPathDetailPage from "@web/pages/learning-paths/[id].astro";
import * as coreLP from "@web/features/learning-paths";
import * as coreProgress from "@web/features/progress";

// Mocking features
vi.mock("@web/features/learning-paths", () => ({
  getAllLearningPaths: vi.fn().mockResolvedValue([]),
  getLearningPathDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock("@web/features/favorites", () => ({
  getIsFavorite: vi.fn().mockResolvedValue(false),
}));

vi.mock("@web/features/progress", () => ({
  getLearningPathProgress: vi.fn().mockResolvedValue({ status: 'not_started', totalItems: 0, completedItems: 0, inProgressItems: 0, progress: 0 }),
  getCourseProgress: vi.fn().mockResolvedValue({ status: 'not_started', totalItems: 0, progress: 0 }),
}));


describe("Learning Paths Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("index.astro", () => {
    it("should render learning paths list", async () => {
      (coreLP.getAllLearningPaths as any).mockResolvedValue([
        { id: 'lp1', title: 'Path 1', description: 'Desc 1' },
        { id: 'lp2', title: 'Path 2', description: 'Desc 2' }
      ]);

      const container = await createTestContainer();
      const html = await container.renderToString(LearningPathsIndexPage);

      expect(html).toContain('Path 1');
      expect(html).toContain('Path 2');
      expect(html).toContain('Learning Paths');
    });

    it("should render empty state when no paths", async () => {
      (coreLP.getAllLearningPaths as any).mockResolvedValue([]);

      const container = await createTestContainer();
      const html = await container.renderToString(LearningPathsIndexPage);

      expect(html).toContain('Sin learning paths descargados.');
    });
  });

  describe("[id].astro", () => {
    it("should render learning path details and its courses", async () => {
      const lpId = 'test-lp';
      (coreLP.getLearningPathDetails as any).mockResolvedValue({
        path: { id: lpId, title: 'Test Path', description: 'Path Description' },
        courses: [
          { id: 'c1', title: 'Course 1', order_index: 1 }
        ]
      });
      (coreProgress.getLearningPathProgress as any).mockResolvedValue({
        status: 'in_progress',
        totalItems: 1,
        completedItems: 0,
        inProgressItems: 1,
        progress: 25
      });
      (coreProgress.getCourseProgress as any).mockResolvedValue({
        status: 'not_started',
        totalItems: 5,
        progress: 0
      });

      const container = await createTestContainer();
      const html = await container.renderToString(LearningPathDetailPage, {
        params: { id: lpId }
      });

      expect(html).toContain('Test Path');
      expect(html).toContain('Path Description');
      expect(html).toContain('Course 1');
      expect(html).toContain('25% completado');
      expect(html).toContain('0 / 1 cursos');
    });

    it("should redirect if path not found", async () => {
      // In Astro Container, redirects might need special handling or just check if it returns empty/header
      // For now, let's just test the found case as redirects are handled by Astro's middleware/runtime
      (coreLP.getLearningPathDetails as any).mockResolvedValue(null);
      const container = await createTestContainer();
      const html = await container.renderToString(LearningPathDetailPage, {
        params: { id: 'unknown' }
      });
      // In container.renderToString, if it redirects it usually returns "" or similar depending on implementation
      expect(html).toBe("");
    });
  });
});
