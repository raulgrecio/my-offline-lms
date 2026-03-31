/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestContainer } from "../utils/test-render";

// Mocking features
vi.mock("@web/features/progress", () => ({
  getAssetProgress: vi.fn().mockImplementation(() => ({ position: 5, completed: false })),
}));

// @ts-ignore
import ViewerPage from "../../src/pages/viewer/index.astro";
import * as coreProgress from "@web/features/progress";

describe("Viewer Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render PDF Viewer when params are provided", async () => {
        (coreProgress.getAssetProgress as any).mockImplementation(() => ({ position: 10, completed: false }));

        const container = await createTestContainer();
        const html = await container.renderToString(ViewerPage, {
            request: new Request('http://localhost/viewer?assetId=asset123&courseId=course456&path=/mnt/data/test.pdf')
        });

        expect(html).toContain('Visor de Guía');
        expect(html).toContain('data-asset-id="asset123"');
        expect(html).toContain('data-course-id="course456"');
        expect(html).toContain('data-initial-page="10"');
    });

    it("should redirect if params are missing", async () => {
        const container = await createTestContainer();
        const html = await container.renderToString(ViewerPage, {
            request: new Request('http://localhost/viewer')
        });

        // Redirects return empty in container
        expect(html).toBe("");
    });
});
