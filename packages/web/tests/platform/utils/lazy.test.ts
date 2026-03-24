import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLazyService } from "../../../src/platform/utils/lazy";

describe("createLazyService", () => {
    it("should initialize the service only once on success", async () => {
        const factory = vi.fn().mockResolvedValue("service-instance");
        const getService = createLazyService(factory);

        const instance1 = await getService();
        const instance2 = await getService();

        expect(instance1).toBe("service-instance");
        expect(instance2).toBe("service-instance");
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should allow retrying if initialization fails", async () => {
        const factory = vi.fn()
            .mockRejectedValueOnce(new Error("First attempt failed"))
            .mockResolvedValueOnce("success-instance");
        
        const getService = createLazyService(factory);

        // First attempt - should fail
        await expect(getService()).rejects.toThrow("First attempt failed");
        expect(factory).toHaveBeenCalledTimes(1);

        // Second attempt - should succeed because promise was reset
        const instance = await getService();
        expect(instance).toBe("success-instance");
        expect(factory).toHaveBeenCalledTimes(2);

        // Third attempt - should return cached instance
        const instanceCached = await getService();
        expect(instanceCached).toBe("success-instance");
        expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should return the same promise for concurrent calls during initialization", async () => {
        let resolveFactory: (value: string) => void;
        const factoryPromise = new Promise<string>((resolve) => {
            resolveFactory = resolve;
        });
        const factory = vi.fn().mockReturnValue(factoryPromise);
        
        const getService = createLazyService(factory);

        // Trigger multiple concurrent calls
        const call1 = getService();
        const call2 = getService();

        // Finish initialization
        resolveFactory!("concurrent-instance");

        const [instance1, instance2] = await Promise.all([call1, call2]);

        expect(instance1).toBe("concurrent-instance");
        expect(instance2).toBe("concurrent-instance");
        expect(factory).toHaveBeenCalledTimes(1);
    });
});
