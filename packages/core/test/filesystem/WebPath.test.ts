import { describe, it, expect } from "vitest";

import { WebPath } from "@core/filesystem/WebPath";

describe("WebPath", () => {
  const wp = new WebPath();

  it("should resolve single path", () => {
    expect(wp.resolve("a")).toBe("a");
  });

  it("should resolve multiple paths by joining with /", () => {
    expect(wp.resolve("a", "b", "c")).toBe("a/b/c");
  });

  it("should join multiple paths by joining with /", () => {
    expect(wp.join("a", "b", "c")).toBe("a/b/c");
  });

  it("should identify absolute paths (protocol or leading slash)", () => {
    expect(wp.isAbsolute("http://example.com")).toBe(true);
    expect(wp.isAbsolute("/abs/path")).toBe(true);
    expect(wp.isAbsolute("rel/path")).toBe(false);
  });

  it("should return dirname", () => {
    expect(wp.dirname("a/b/c")).toBe("a/b");
    expect(wp.dirname("/a")).toBe("/");
    expect(wp.dirname("file.txt")).toBe("file.txt");
    expect(wp.dirname("a/")).toBe("a");
  });

  it("should return extname", () => {
    expect(wp.extname("file.txt")).toBe(".txt");
    expect(wp.extname("path/to/file.png")).toBe(".png");
    expect(wp.extname(".gitignore")).toBe(".gitignore");
    expect(wp.extname("noextension")).toBe("");
    expect(wp.extname("path.with.dots/file")).toBe("");
  });

  it("should provide / as separator", () => {
    expect(wp.sep).toBe("/");
  });
});
