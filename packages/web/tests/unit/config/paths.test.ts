import { describe, it, expect, vi, beforeEach } from "vitest";
import * as paths from "@web/config/paths";

describe("Paths Config", () => {
    it("should return monorepo root", async () => {
        const root = await paths.getMonorepoRoot();
        expect(root).toBeDefined();
    });

    it("should return web root", async () => {
        const webRoot = await paths.getWebRoot();
        expect(webRoot).toBeDefined();
    });

    it("should return data root", async () => {
        const dataRoot = await paths.getDataRoot();
        expect(dataRoot).toBeDefined();
    });

    it("should return db path", async () => {
        const dbPath = await paths.getDbPath();
        expect(dbPath).toBeDefined();
    });

    it("should return asset config path", async () => {
        const assetConfig = await paths.getAssetConfigPath();
        expect(assetConfig).toBeDefined();
    });

    it("should expose the resolver", () => {
        expect(paths.resolver).toBeDefined();
    });
});
