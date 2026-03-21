import { describe, it, expect, vi } from "vitest";
import { NodeFileSystem } from "@filesystem/NodeFileSystem";
import fs from "fs";
import path from "path";

vi.mock("fs");
vi.mock("path");

describe("NodeFileSystem", () => {
  const nfs = new NodeFileSystem();

  it("should delegate to fs and path methods", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    expect(nfs.existsSync("foo")).toBe(true);

    vi.mocked(fs.readFileSync).mockReturnValue("data");
    expect(nfs.readFileSync("foo", "utf-8")).toBe("data");
    expect(nfs.readFileSync("foo")).toBe("data");

    nfs.writeFileSync("foo", "data");
    expect(fs.writeFileSync).toHaveBeenCalledWith("foo", "data");

    vi.mocked(path.resolve).mockReturnValue("/abs");
    expect(nfs.resolve("rel")).toBe("/abs");

    vi.mocked(path.join).mockReturnValue("a/b");
    expect(nfs.join("a", "b")).toBe("a/b");

    vi.mocked(path.isAbsolute).mockReturnValue(true);
    expect(nfs.isAbsolute("/a")).toBe(true);

    vi.mocked(path.dirname).mockReturnValue("/dir");
    expect(nfs.dirname("/a/b")).toBe("/dir");

    vi.mocked(fs.readdirSync).mockReturnValue(["a"] as any);
    expect(nfs.readdirSync("/dir")).toEqual(["a"]);

    nfs.mkdirSync("/dir", { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith("/dir", { recursive: true });

    nfs.rmSync("/dir", { force: true });
    expect(fs.rmSync).toHaveBeenCalledWith("/dir", { force: true });

    vi.mocked(fs.statSync).mockReturnValue({ size: 10, mtime: new Date(), isDirectory: () => false } as any);
    const stats = nfs.statSync("/file");
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
