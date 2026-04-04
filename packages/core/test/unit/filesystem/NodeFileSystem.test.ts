import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";

import { NodeFileSystem } from "@core/filesystem";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    statSync: vi.fn(),
    createReadStream: vi.fn().mockReturnValue({ on: vi.fn(), pipe: vi.fn(), push: vi.fn(), _read: vi.fn() } as any),
    createWriteStream: vi.fn().mockReturnValue({ on: vi.fn(), write: vi.fn(), end: vi.fn(), _write: vi.fn() } as any),
    promises: {
      access: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn(),
      mkdir: vi.fn(),
      rm: vi.fn(),
      stat: vi.fn(),
      unlink: vi.fn(),
      rename: vi.fn(),
      appendFile: vi.fn(),
    }
  }
}));
vi.mock("path");
vi.mock("node:stream", () => ({
  Readable: {
    toWeb: vi.fn().mockReturnValue({} as any),
  },
  Writable: {
    toWeb: vi.fn().mockReturnValue({} as any),
  },
}));

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

    const readStream = nfs.createReadStream("/file");
    expect(fs.createReadStream).toHaveBeenCalledWith("/file", undefined);
    expect(readStream).toBeDefined();

    const writeStream = nfs.createWriteStream("/file");
    expect(fs.createWriteStream).toHaveBeenCalledWith("/file", undefined);
    expect(writeStream).toBeDefined();

    // exists false branch
    vi.mocked(fs.promises.access).mockRejectedValue(new Error("not found"));
    expect(await nfs.exists("not-found")).toBe(false);

    // unlink
    vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);
    await nfs.unlink("foo");
    expect(fs.promises.unlink).toHaveBeenCalledWith("foo");

    // rename
    vi.mocked(fs.promises.rename).mockResolvedValue(undefined);
    await nfs.rename("old", "new");
    expect(fs.promises.rename).toHaveBeenCalledWith("old", "new");

    // appendFile
    vi.mocked(fs.promises.appendFile).mockResolvedValue(undefined);
    await nfs.appendFile("foo", "append data");
    expect(fs.promises.appendFile).toHaveBeenCalledWith("foo", "append data");
  });
});
