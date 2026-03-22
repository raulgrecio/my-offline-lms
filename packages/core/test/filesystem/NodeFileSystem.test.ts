import { describe, it, expect, vi } from "vitest";
import { NodeFileSystem } from "@filesystem/NodeFileSystem";
import fs from "fs";
import path from "path";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    statSync: vi.fn(),
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
    promises: {
      access: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn(),
      mkdir: vi.fn(),
      rm: vi.fn(),
      stat: vi.fn(),
      unlink: vi.fn(),
    }
  }
}));
vi.mock("path");

describe("NodeFileSystem", () => {
  const nfs = new NodeFileSystem();

  it("should delegate to fs and path methods", async () => {
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);
    expect(await nfs.exists("foo")).toBe(true);

    vi.mocked(fs.promises.readFile).mockResolvedValue("data");
    expect(await nfs.readFile("foo", "utf-8")).toBe("data");
    expect(await nfs.readFile("foo")).toBe("data");

    vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
    await nfs.writeFile("foo", "data");
    expect(fs.promises.writeFile).toHaveBeenCalledWith("foo", "data");

    vi.mocked(path.resolve).mockReturnValue("/abs");
    expect(nfs.resolve("rel")).toBe("/abs");

    vi.mocked(path.join).mockReturnValue("a/b");
    expect(nfs.join("a", "b")).toBe("a/b");

    vi.mocked(path.isAbsolute).mockReturnValue(true);
    expect(nfs.isAbsolute("/a")).toBe(true);

    vi.mocked(path.dirname).mockReturnValue("/dir");
    expect(nfs.dirname("/a/b")).toBe("/dir");

    vi.mocked(fs.promises.readdir).mockResolvedValue(["a"] as any);
    expect(await nfs.readdir("/dir")).toEqual(["a"]);

    vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined as any);
    await nfs.mkdir("/dir", { recursive: true });
    expect(fs.promises.mkdir).toHaveBeenCalledWith("/dir", { recursive: true });

    vi.mocked(fs.promises.rm).mockResolvedValue(undefined);
    await nfs.rm("/dir", { force: true });
    expect(fs.promises.rm).toHaveBeenCalledWith("/dir", { force: true });

    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 10, mtime: new Date(), isDirectory: () => false } as any);
    const stats = await nfs.stat("/file");
    expect(stats.size).toBe(10);
    expect(stats.isDirectory()).toBe(false);

    nfs.createReadStream("/file");
    expect(fs.createReadStream).toHaveBeenCalledWith("/file", undefined);

    nfs.createWriteStream("/file");
    expect(fs.createWriteStream).toHaveBeenCalledWith("/file");
    
    // @ts-ignore
    path.sep = "/";
    expect(nfs.sep).toBe("/");
  });
});
