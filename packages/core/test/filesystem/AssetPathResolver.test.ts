import { describe, it, expect, vi } from "vitest";
import { AssetPathResolver } from "@filesystem/AssetPathResolver";
import { IFileSystem } from "@filesystem/IFileSystem";

describe("AssetPathResolver (Windows Support)", () => {
  const mockFs: IFileSystem = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    dirname: (p: string) => p.split("/").slice(0, -1).join("/") || "/",
    readdirSync: vi.fn(),
    mkdirSync: vi.fn(),
    sep: "/", // Simulating Linux/Posix environment
    join: (...p: string[]) => p.join("/"),
    isAbsolute: (p: string) => p.startsWith("/"),
    resolve: (...p: string[]) => p.join("/"),
  } as any;

  it("should extract correctly courseId/type/filename from a Windows path on Linux", () => {
    // 1. Mock the initial config read so constructor works
    vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({
      defaultWritePath: "/data",
      searchPaths: [{ path: "/new-root", label: "New Root" }]
    }));
    vi.mocked(mockFs.existsSync).mockImplementation((p) => {
      if (p === "/config.json") return true;
      if (p === "/new-root") return true; // Path base must be available
      return false;
    });

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
    });

    // Path in Windows format
    const winPath = "E:\\old\\base\\123\\videos\\test.mp4";

    // We expect it to find '123' (courseId), 'videos' (type), 'test.mp4' (filename)
    // and then search in '/new-root/123/videos/test.mp4'

    // 2. Mock existence of the target file in the search path
    vi.mocked(mockFs.existsSync).mockImplementation((p) => {
      if (p === "/config.json") return true;
      if (p === "/new-root") return true;
      if (p === "/new-root/123/videos/test.mp4") return true;
      return false;
    });

    const result = resolver.resolveExistingPath(winPath);

    expect(result).toBe("/new-root/123/videos/test.mp4");
  });

  it("should extract correctly courseId/type/filename from UNC paths", () => {
    vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({
      defaultWritePath: "data/assets",
      searchPaths: [{ path: "data/assets", label: "Default" }]
    }));
    vi.mocked(mockFs.existsSync).mockImplementation((p) => {
      if (p === "/config.json") return true;
      if (p === "/root/data/assets") return true;
      return false;
    });

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
    });

    const uncPath = "\\\\server\\share\\123\\guides\\manual.pdf";

    vi.mocked(mockFs.existsSync).mockImplementation((p) => {
      if (p === "/config.json") return true;
      if (p === "/root/data/assets") return true;
      if (p === "/root/data/assets/123/guides/manual.pdf") return true;
      return false;
    });

    const result = resolver.resolveExistingPath(uncPath);

    expect(result).toBe("/root/data/assets/123/guides/manual.pdf");
  });

  it("should list assets across all available paths", () => {
    vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({
      defaultWritePath: "/data",
      searchPaths: [
        { path: "/p1", label: "P1" },
        { path: "/p2", label: "P2" }
      ]
    }));
    vi.mocked(mockFs.existsSync).mockImplementation((p) => p === "/config.json" || p === "/p1" || p === "/p2");

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
    });

    vi.mocked(mockFs.readdirSync).mockImplementation((p) => {
      if (p === "/p1/123/videos") return ["v1.mp4"];
      if (p === "/p2/123/videos") return ["v2.mp4"];
      return [];
    });
    vi.mocked(mockFs.existsSync).mockImplementation((p) => {
      if (p === "/p1/123/videos" || p === "/p2/123/videos" || p === "/p1" || p === "/p2" || p === "/config.json") return true;
      return false;
    });

    const assets = resolver.listAssets("123", "video");
    expect(assets).toEqual(["/p1/123/videos/v1.mp4", "/p2/123/videos/v2.mp4"]);

    // Test case: Directory does not exist in one of the search paths
    vi.mocked(mockFs.existsSync).mockImplementation((p) => p === "/p1" || p === "/p2" || p === "/config.json" || p === "/p1/123/videos");
    const assets2 = resolver.listAssets("123", "video");
    expect(assets2).toEqual(["/p1/123/videos/v1.mp4"]);
  });

  it("should manage search paths (save and remove)", () => {
    vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({
      defaultWritePath: "/data",
      searchPaths: [{ path: "/p1", label: "P1" }]
    }));
    vi.mocked(mockFs.existsSync).mockReturnValue(true);

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
    });

    // Save new path
    resolver.saveNewPath("/p2", "P2");
    expect(mockFs.writeFileSync).toHaveBeenCalled();
    const saveArgs = JSON.parse(vi.mocked(mockFs.writeFileSync).mock.calls[0][1] as string);
    expect(saveArgs.searchPaths).toContainEqual({ path: "/p2", label: "P2" });

    // Verify duplicate paths are not saved again
    const callsBeforeDup = vi.mocked(mockFs.writeFileSync).mock.calls.length;
    resolver.saveNewPath("/p2", "P2");
    expect(vi.mocked(mockFs.writeFileSync).mock.calls.length).toBe(callsBeforeDup);

    // Remove path
    resolver.removePath("/p1");
    const removeArgs = JSON.parse(vi.mocked(mockFs.writeFileSync).mock.calls[callsBeforeDup][1] as string);
    expect(removeArgs.searchPaths).toHaveLength(1);
    expect(removeArgs.searchPaths[0].path).toBe("/p2");
  });

  it("should return default write path", () => {
    vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({
      defaultWritePath: "/custom-data",
      searchPaths: []
    }));
    vi.mocked(mockFs.existsSync).mockReturnValue(true);

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
    });

    expect(resolver.getDefaultWritePath()).toBe("/custom-data");
  });

  it("should handle absolute and relative search paths", () => {
    vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({
      defaultWritePath: "/data",
      searchPaths: [
        { path: "/abs", label: "Abs" },
        { path: "rel", label: "Rel" }
      ]
    }));
    vi.mocked(mockFs.existsSync).mockImplementation((p) => {
      if (p === "/abs" || p === "/root/rel" || p === "/config.json") return true;
      return false;
    });

    const resolver = new AssetPathResolver({
      configPath: "/config.json",
      monorepoRoot: "/root",
      fs: mockFs,
    });

    expect(resolver.assetExistsAnywhere("1", "video", "not-exists.mp4")).toBe(false);
  });

  it("should handle missing or corrupt config file and silence errors", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });

    vi.mocked(mockFs.existsSync).mockImplementation((p) => {
      if (p === "/config.json") return false;
      if (p === "/") return false;
      return true;
    });
    new AssetPathResolver({ configPath: "/config.json", monorepoRoot: "/root", fs: mockFs });
    expect(mockFs.mkdirSync).toHaveBeenCalledWith("/", { recursive: true });

    vi.mocked(mockFs.existsSync).mockReturnValue(true);
    vi.mocked(mockFs.readFileSync).mockReturnValue("NOT JSON");
    new AssetPathResolver({ configPath: "/config.json", monorepoRoot: "/root", fs: mockFs });

    errorSpy.mockRestore();
  });

  it("should handle readdirSync error in listAssets", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({
      defaultWritePath: "/data",
      searchPaths: [{ path: "/p1", label: "P1" }]
    }));
    vi.mocked(mockFs.existsSync).mockReturnValue(true);
    vi.mocked(mockFs.readdirSync).mockImplementation(() => { throw new Error("Disk error"); });

    const resolver = new AssetPathResolver({ configPath: "/config.json", monorepoRoot: "/root", fs: mockFs });

    const assets = resolver.listAssets("123", "video");
    expect(assets).toEqual([]);
    errorSpy.mockRestore();
  });

  it("should handle null config edge cases", () => {
    vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ defaultWritePath: "/data", searchPaths: [] }));
    vi.mocked(mockFs.existsSync).mockReturnValue(true);
    const resolver = new AssetPathResolver({ configPath: "/c.json", monorepoRoot: "/r", fs: mockFs });

    // Force null config to hit defensive branches
    (resolver as any).config = null;
    expect(resolver.getAvailablePaths()).toEqual([]);
    expect(resolver.getDefaultWritePath()).toBe("/r/data/assets");
    expect(() => resolver.saveNewPath("/p", "L")).not.toThrow();
    expect(() => resolver.removePath("/p")).not.toThrow();
    (resolver as any).saveConfig();
  });

  it("should handle resolveExistingPath edge cases", () => {
    vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ defaultWritePath: "/data", searchPaths: [] }));
    vi.mocked(mockFs.existsSync).mockReturnValue(true);
    const resolver = new AssetPathResolver({ configPath: "/c.json", monorepoRoot: "/r", fs: mockFs });

    // Path already exists
    vi.mocked(mockFs.existsSync).mockReturnValue(true);
    expect(resolver.resolveExistingPath("/already/exists.mp4")).toBe("/already/exists.mp4");

    // Short path
    vi.mocked(mockFs.existsSync).mockReturnValue(false);
    expect(resolver.resolveExistingPath("/tmp")).toBeNull();

    // Unknown type
    expect(resolver.resolveExistingPath("/a/unknown/file.txt")).toBeNull();
  });
});
