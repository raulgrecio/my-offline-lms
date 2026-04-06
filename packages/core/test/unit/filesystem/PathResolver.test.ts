import { describe, it, expect, vi, beforeEach } from "vitest";
import { PathResolver } from "@core/filesystem/PathResolver";
import type { IFileSystem, IPath } from "@core/filesystem";

describe("PathResolver", () => {
  const mockFs: Partial<IFileSystem> = {
    exists: vi.fn(),
  };

  const mockPath: Partial<IPath> = {
    resolve: vi.fn((...args) => args.join("/")),
    dirname: vi.fn((p) => p.split("/").slice(0, -1).join("/") || "/"),
    join: vi.fn((...args) => args.filter(Boolean).join("/")),
    isAbsolute: vi.fn((p) => p.startsWith("/")),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw if no path adapter provided", () => {
    expect(() => new PathResolver({ fs: mockFs as any, path: undefined as any }))
      .toThrow("PathResolver requires a path adapter");
  });

  it("should find monorepo root by walking up folders", async () => {
    const resolver = new PathResolver({
      fs: mockFs as any,
      path: mockPath as any,
      startDir: "/a/b/c/packages/core",
    });

    // Mock exists: only true for /a/b/c/pnpm-workspace.yaml
    vi.mocked(mockFs.exists!).mockImplementation(async (p) => {
      return p === "/a/b/c/pnpm-workspace.yaml";
    });


    const root = await resolver.getMonorepoRoot();
    expect(root).toBe("/a/b/c");
  });

  it("should return startDir if root not found (safety fallback)", async () => {
    const resolver = new PathResolver({
      fs: mockFs as any,
      path: mockPath as any,
      startDir: "/outside",
    });
    vi.mocked(mockFs.exists!).mockResolvedValue(false);

    const root = await resolver.getMonorepoRoot();
    expect(root).toBe("/outside");
  });

  it("should construct paths for web, scraper and data", async () => {
    const resolver = new PathResolver({
      fs: mockFs as any,
      path: mockPath as any,
      startDir: "/root",
      env: { DATA_DIR: "my-data" }
    });
    vi.mocked(mockFs.exists!).mockResolvedValue(true); // Finds root at first try


    expect(await resolver.getDataRoot()).toBe("/root/my-data");
    expect(await resolver.getDbPath()).toBe("/root/my-data/db.sqlite");
    expect(await resolver.getAssetConfigPath("config.json")).toBe("/root/my-data/config.json");
    expect(await resolver.getWebRoot()).toBe("/root/packages/web");
    expect(await resolver.getScraperRoot()).toBe("/root/packages/scraper");
  });

  it("should handle absolute DATA_DIR path", async () => {
    const resolver = new PathResolver({
      fs: mockFs as any,
      path: mockPath as any,
      env: { DATA_DIR: "/abs/data" }
    });
    expect(await resolver.getDataRoot()).toBe("/abs/data");
  });

  it("should use default 'data' if DATA_DIR is not set", async () => {
    const resolver = new PathResolver({
      fs: mockFs as any,
      path: mockPath as any,
      startDir: "/root",
      env: {} // No DATA_DIR
    });
    vi.mocked(mockFs.exists!).mockResolvedValue(true);
    expect(await resolver.getDataRoot()).toBe("/root/data");
  });

  it("should cache monorepo root calculation", async () => {
    const resolver = new PathResolver({
      fs: mockFs as any,
      path: mockPath as any,
      startDir: "/root",
    });
    vi.mocked(mockFs.exists!).mockResolvedValue(true);

    await resolver.getMonorepoRoot();
    await resolver.getMonorepoRoot();

    // Should only have called exists once for the root
    expect(vi.mocked(mockFs.exists!).mock.calls.filter(c => c[0].includes("pnpm-workspace")).length).toBe(1);
  });

  describe("Coverage Extensions", () => {
    it("should use default filenames for DB and Config paths", async () => {
      const resolver = new PathResolver({
        fs: mockFs as any,
        path: mockPath as any,
        startDir: "/root",
        env: { DATA_DIR: "data" }
      });
      vi.mocked(mockFs.exists!).mockResolvedValue(true);

      expect(await resolver.getDbPath()).toBe("/root/data/db.sqlite");
      expect(await resolver.getAssetConfigPath()).toBe("/root/data/asset-paths.json");
    });

    it("should stop walking up at system root", async () => {
      const resolver = new PathResolver({
        fs: mockFs as any,
        path: mockPath as any,
        startDir: "/a",
      });
      vi.mocked(mockFs.exists!).mockResolvedValue(false);

      const root = await resolver.getMonorepoRoot();
      expect(root).toBe("/a");
      expect(mockPath.dirname).toHaveBeenCalledWith("/");
    });

    it("should handle default environment and start directory", () => {
      const resolver = new PathResolver({
        fs: mockFs as any,
        path: mockPath as any
      });
      expect(resolver).toBeDefined();
      expect((resolver as any).env).toBe(process.env);
      expect((resolver as any).startDir).toBe(process.cwd());
    });
  });
});


