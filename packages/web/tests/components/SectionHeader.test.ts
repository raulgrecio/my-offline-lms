/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import SectionHeader from "../../src/components/SectionHeader.astro";

describe("SectionHeader.astro", () => {
    it("should render title and icon", async () => {
        const container = await createTestContainer();
        const html = await container.renderToString(SectionHeader, { 
            props: { title: 'Recent Courses', icon: 'clock' } 
        });
        expect(html).toContain('Recent Courses');
        expect(html).toContain('svg'); // Icon renders an SVG
    });

    it("should render link when href is provided", async () => {
        const container = await createTestContainer();
        const html = await container.renderToString(SectionHeader, { 
            props: { title: 'Recent Courses', icon: 'clock', href: '/courses' } 
        });
        expect(html).toContain('href="/courses"');
        expect(html).toContain('Ver más');
    });
});
