import { describe, it, expect, vi } from "vitest";

import { NoopLogger } from "@core/logging";

import { AssetPathResolver, type IFileSystem, type IPath } from "@core/filesystem";

describe("AssetPathResolver (Windows Support)", () => {
  const mockFs: IFileSystem = {
    exists: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    rm: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
    stat: vi.fn(),
    createReadStream: function (p: string, options?: any): ReadableStream | null {
      throw new Error("Function not implemented.");
    },
    createWriteStream: function (p: string, options?: any): WritableStream | null {
      throw new Error("Function not implemented.");
    },
    appendFile: function (p: string, content: string | Buffer): Promise<void> {
      throw new Error("Function not implemented.");
    }
  };

  const mockPath: IPath = {
    dirname: (p: string) => p.split("/").slice(0, -1).join("/") || "/",
    extname: (p: string) => {
      const match = p.match(/\.[^/.]+$/);
      return match ? match[0] : "";
    },
    sep: "/", // Simulating Linux/Posix environment
    join: (...p: string[]) => p.join("/"),
    isAbsolute: (p: string) => p.startsWith("/"),
    resolve: (...p: string[]) => p.join("/"),
  };

  it("should extract correctly courseId/type/filename from a Windows path on Linux", async () => {
    // 1. Mock the initial config read so constructor works
    vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({
      defaultWritePath: "/data",
      searchPaths: [{ path: "/new-root", label: "New Root" }]
    }));
    vi.mocked(mockFs.exists).mockImplementation(async (p) => {
      if (p === "/config.json") return true;
      if (p === "/new-root") return true; // Path base must be available
      return false;
    });

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
      path: mockPath,
      logger: new NoopLogger(),
    });
    await resolver.ensureInitialized();

    // Path in Windows format
    const winPath = "E:\\old\\base\\123\\videos\\test.mp4";

    // We expect it to find '123' (courseId), 'videos' (type), 'test.mp4' (filename)
    // and then search in '/new-root/123/videos/test.mp4'

    // 2. Mock existence of the target file in the search path
    vi.mocked(mockFs.exists).mockImplementation(async (p) => {
      if (p === "/config.json") return true;
      if (p === "/new-root") return true;
      if (p === "/new-root/123/videos/test.mp4") return true;
      return false;
    });

    const result = await resolver.resolveExistingPath(winPath);

    expect(result).toBe("/new-root/123/videos/test.mp4");
  });

  it("should extract correctly courseId/type/filename from UNC paths", async () => {
    vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({
      defaultWritePath: "data/assets",
      searchPaths: [{ path: "data/assets", label: "Default" }]
    }));
    vi.mocked(mockFs.exists).mockImplementation(async (p) => {
      if (p === "/config.json") return true;
      if (p === "/root/data/assets") return true;
      return false;
    });

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
      path: mockPath,
      logger: new NoopLogger(),
    });
    await resolver.ensureInitialized();

    const uncPath = "\\\\server\\share\\123\\guides\\manual.pdf";

    vi.mocked(mockFs.exists).mockImplementation(async (p) => {
      if (p === "/config.json") return true;
      if (p === "/root/data/assets") return true;
      if (p === "/root/data/assets/123/guides/manual.pdf") return true;
      return false;
    });

    const result = await resolver.resolveExistingPath(uncPath);

    expect(result).toBe("/root/data/assets/123/guides/manual.pdf");
  });

  it("should list assets across all available paths", async () => {
    vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({
      defaultWritePath: "/data",
      searchPaths: [
        { path: "/p1", label: "P1" },
        { path: "/p2", label: "P2" }
      ]
    }));
    vi.mocked(mockFs.exists).mockImplementation(async (p) => p === "/config.json" || p === "/p1" || p === "/p2");

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
      path: mockPath,
      logger: new NoopLogger(),
    });
    await resolver.ensureInitialized();

    vi.mocked(mockFs.readdir).mockImplementation(async (p) => {
      if (p === "/p1/123/videos") return ["v1.mp4"];
      if (p === "/p2/123/videos") return ["v2.mp4"];
      return [];
    });
    vi.mocked(mockFs.exists).mockImplementation(async (p) => {
      if (p === "/p1/123/videos" || p === "/p2/123/videos" || p === "/p1" || p === "/p2" || p === "/config.json") return true;
      return false;
    });

    const assets = await resolver.listAssets("123", "video");
    expect(assets).toEqual(["/p1/123/videos/v1.mp4", "/p2/123/videos/v2.mp4"]);

    // Test case: Directory does not exist in one of the search paths
    vi.mocked(mockFs.exists).mockImplementation(async (p) => p === "/p1" || p === "/p2" || p === "/config.json" || p === "/p1/123/videos");
    const assets2 = await resolver.listAssets("123", "video");
    expect(assets2).toEqual(["/p1/123/videos/v1.mp4"]);
  });

  it("should manage search paths (save and remove)", async () => {
    vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({
      defaultWritePath: "/data",
      searchPaths: [{ path: "/p1", label: "P1" }]
    }));
    vi.mocked(mockFs.exists).mockResolvedValue(true);

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
      path: mockPath,
      logger: new NoopLogger(),
    });
    await resolver.ensureInitialized();

    // Save new path
    await resolver.saveNewPath("/p2", "P2");
    expect(mockFs.writeFile).toHaveBeenCalled();
    const saveArgs = JSON.parse(vi.mocked(mockFs.writeFile).mock.calls[0][1] as string);
    expect(saveArgs.searchPaths).toContainEqual({ path: "/p2", label: "P2" });

    // Verify duplicate paths are not saved again
    const callsBeforeDup = vi.mocked(mockFs.writeFile).mock.calls.length;
    await resolver.saveNewPath("/p2", "P2");
    expect(vi.mocked(mockFs.writeFile).mock.calls.length).toBe(callsBeforeDup);

    // Remove path
    await resolver.removePath("/p1");
    const removeArgs = JSON.parse(vi.mocked(mockFs.writeFile).mock.calls[callsBeforeDup][1] as string);
    expect(removeArgs.searchPaths).toHaveLength(1);
    expect(removeArgs.searchPaths[0].path).toBe("/p2");
  });

  it("should return default write path", async () => {
    vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({
      defaultWritePath: "/custom-data",
      searchPaths: []
    }));
    vi.mocked(mockFs.exists).mockResolvedValue(true);

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
      path: mockPath,
      logger: new NoopLogger(),
    });
    await resolver.ensureInitialized();

    expect(await resolver.getDefaultWritePath()).toBe("/custom-data");
  });

  describe("Coverage Extensions", () => {
    it("should handle concurrent initialization calls", async () => {
      vi.mocked(mockFs.exists).mockResolvedValue(true);
      vi.mocked(mockFs.readFile).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(JSON.stringify({})), 10)));
      const resolver = new AssetPathResolver({ configPath: "/c.json", monorepoRoot: "/r", fs: mockFs, path: mockPath, logger: new NoopLogger() });
      const p1 = resolver.ensureInitialized();
      const p2 = resolver.ensureInitialized();
      expect(p1).toStrictEqual(p2);
      await p1;
    });

    it("should handle catastrophic disk errors during config load", async () => {
      vi.mocked(mockFs.exists).mockResolvedValue(true);
      vi.mocked(mockFs.readFile).mockRejectedValue(new Error("Disk Failure"));
      const resolver = new AssetPathResolver({ configPath: "/c.json", monorepoRoot: "/r", fs: mockFs, path: mockPath, logger: new NoopLogger() });
      await expect(resolver.ensureInitialized()).resolves.toBeUndefined();
      expect(await resolver.getDefaultWritePath()).toBe("/r/data/assets");
    });

    it("should handle absolute and relative search paths", async () => {
      vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({ defaultWritePath: "/data", searchPaths: [{ path: "/abs", label: "Abs" }, { path: "rel", label: "Rel" }] }));
      vi.mocked(mockFs.exists).mockImplementation(async (p) => {
        if (p === "/abs" || p === "/root/rel" || p === "/config.json") return true;
        return false;
      });
      const resolver = new AssetPathResolver({ configPath: "/config.json", monorepoRoot: "/root", fs: mockFs, path: mockPath, logger: new NoopLogger() });
      await resolver.ensureInitialized();
      expect(await resolver.assetExistsAnywhere("1", "video", "not-exists.mp4")).toBe(false);
    });

    it("should handle missing or corrupt config file and silence errors", async () => {
      vi.mocked(mockFs.exists).mockImplementation(async (p) => {
        if (p === "/config.json") return false;
        if (p === "/") return false;
        return true;
      });
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      const r1 = new AssetPathResolver({ configPath: "/config.json", monorepoRoot: "/root", fs: mockFs, path: mockPath, logger: new NoopLogger() });
      await r1.ensureInitialized();
      expect(mockFs.mkdir).toHaveBeenCalledWith("/", { recursive: true });

      vi.mocked(mockFs.exists).mockResolvedValue(true);
      vi.mocked(mockFs.readFile).mockResolvedValue("NOT JSON");
      const r2 = new AssetPathResolver({ configPath: "/config.json", monorepoRoot: "/root", fs: mockFs, path: mockPath, logger: new NoopLogger() });
      await r2.ensureInitialized();
    });

    it("should handle readdir error in listAssets", async () => {
      vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({ defaultWritePath: "/data", searchPaths: [{ path: "/p1", label: "P1" }] }));
      vi.mocked(mockFs.exists).mockResolvedValue(true);
      vi.mocked(mockFs.readdir).mockRejectedValue(new Error("Disk error"));
      const resolver = new AssetPathResolver({ configPath: "/config.json", monorepoRoot: "/root", fs: mockFs, path: mockPath, logger: new NoopLogger() });
      await resolver.ensureInitialized();
      const assets = await resolver.listAssets("123", "video");
      expect(assets).toEqual([]);
    });

    it("should handle null config edge cases", async () => {
      vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({ defaultWritePath: "/data", searchPaths: [] }));
      vi.mocked(mockFs.exists).mockResolvedValue(true);
      const resolver = new AssetPathResolver({ configPath: "/c.json", monorepoRoot: "/r", fs: mockFs, path: mockPath, logger: new NoopLogger() });
      await resolver.ensureInitialized();
      (resolver as any).config = null;
      expect(await resolver.getAvailablePaths()).toEqual([]);
      expect(await resolver.getDefaultWritePath()).toBe("/r/data/assets");
      await expect(resolver.saveNewPath("/p", "L")).resolves.toBeUndefined();
      await expect(resolver.removePath("/p")).resolves.toBeUndefined();
      await (resolver as any).saveConfig();
    });

    it("should handle resolveExistingPath edge cases", async () => {
      vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({ defaultWritePath: "/data", searchPaths: [] }));
      vi.mocked(mockFs.exists).mockResolvedValue(true);
      const resolver = new AssetPathResolver({ configPath: "/c.json", monorepoRoot: "/r", fs: mockFs, path: mockPath, logger: new NoopLogger() });
      await resolver.ensureInitialized();
      vi.mocked(mockFs.exists).mockResolvedValue(true);
      expect(await resolver.resolveExistingPath("/already/exists.mp4")).toBe("/already/exists.mp4");
      vi.mocked(mockFs.exists).mockResolvedValue(false);
      expect(await resolver.resolveExistingPath("/tmp")).toBeNull();
      expect(await resolver.resolveExistingPath("/a/unknown/file.txt")).toBeNull();
    });
  });
});
