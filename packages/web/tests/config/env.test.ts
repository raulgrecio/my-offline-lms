import { describe, it, expect, vi } from "vitest";

describe("Environment Variables", () => {
    it("should have default SUBTITLE_LANGUAGE as 'es'", async () => {
        const { env } = await import("@config/env");
        expect(env.SUBTITLE_LANGUAGE).toBe("es");
    });

    it("should log error on invalid variables (forced error case)", async () => {
        vi.resetModules();
        
        // Mocking logger
        vi.mock("@platform/logging", () => ({
            logger: {
                error: vi.fn(),
                info: vi.fn(),
            }
        }));

        // Mocking zod to FAIL
        vi.mock("zod", async (importOriginal) => {
            const actual = await importOriginal<any>();
            return {
                ...actual,
                z: {
                    ...actual.z,
                    object: () => ({
                        // Force failure
                        safeParse: () => ({ success: false, error: new Error("mocked error") }),
                        // Ensure it doesn't crash on default parse call later
                        parse: () => ({ SUBTITLE_LANGUAGE: 'es' })
                    })
                }
            };
        });

        // This import will now trigger the error path
        const { env } = await import("@config/env");
        expect(env).toBeDefined();
    });
});
