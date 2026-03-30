/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestContainer } from "../utils/test-render";

// Mocking features
vi.mock("@features/courses", () => ({
  getAllCourses: vi.fn().mockResolvedValue([]),
  getCourseById: vi.fn().mockResolvedValue(null),
  getAssetsByCourseId: vi.fn().mockResolvedValue([]),
}));

vi.mock("@features/favorites", () => ({
  getIsFavorite: vi.fn().mockResolvedValue(false),
}));

vi.mock("@features/progress", () => ({
  getCourseProgress: vi.fn().mockResolvedValue({ status: 'not_started', totalItems: 0, progress: 0 }),
  getAssetProgress: vi.fn().mockResolvedValue({ status: 'not_started', totalItems: 0, progress: 0 }),
}));

// @ts-ignore
import CoursesIndexPage from "../../src/pages/courses/index.astro";
// @ts-ignore
import CourseDetailPage from "../../src/pages/courses/[id].astro";
import * as coreCourses from "@features/courses";
import * as coreProgress from "@features/progress";

describe("Courses Pages", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("index.astro", () => {
        it("should render courses list", async () => {
            (coreCourses.getAllCourses as any).mockResolvedValue([
                { id: 'c1', title: 'Course 1' },
                { id: 'c2', title: 'Course 2' }
            ]);

            const container = await createTestContainer();
            const html = await container.renderToString(CoursesIndexPage);

            expect(html).toContain('Course 1');
            expect(html).toContain('Course 2');
            expect(html).toContain('Cursos');
        });

        it("should render empty state when no courses", async () => {
            (coreCourses.getAllCourses as any).mockResolvedValue([]);

            const container = await createTestContainer();
            const html = await container.renderToString(CoursesIndexPage);

            expect(html).toContain('Sin cursos descargados.');
        });
    });

    describe("[id].astro", () => {
        it("should render course details and assets", async () => {
            const courseId = 'test-id';
            (coreCourses.getCourseById as any).mockResolvedValue({ id: courseId, title: 'Test Course' });
            (coreCourses.getAssetsByCourseId as any).mockResolvedValue([
                { id: 'v1', type: 'video', status: 'COMPLETED', localPath: 'v1.mp4', metadata: { name: 'Video 1', order_index: 1 } },
                { id: 'g1', type: 'guide', status: 'COMPLETED', localPath: 'g1.pdf', metadata: { name: 'Guide 1', order_index: 2, totalPages: 10 } }
            ]);
            (coreProgress.getCourseProgress as any).mockResolvedValue({ status: 'in_progress', totalItems: 2, progress: 50 });

            const container = await createTestContainer();
            const html = await container.renderToString(CourseDetailPage, {
                params: { id: courseId }
            });

            expect(html).toContain('Test Course');
            expect(html).toContain('Video 1');
            expect(html).toContain('Guide 1');
            expect(html).toContain('Vídeos (1)');
            expect(html).toContain('Guías (1)');
        });

        it("should render empty content state when no assets", async () => {
            const courseId = 'empty-course';
            (coreCourses.getCourseById as any).mockResolvedValue({ id: courseId, title: 'Empty Course' });
            (coreCourses.getAssetsByCourseId as any).mockResolvedValue([]);

            const container = await createTestContainer();
            const html = await container.renderToString(CourseDetailPage, {
                params: { id: courseId }
            });

            expect(html).toContain('Empty Course');
            expect(html).toContain('No hay assets descargados para este curso.');
        });
    });
});
